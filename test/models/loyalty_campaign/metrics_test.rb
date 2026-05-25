# frozen_string_literal: true

require "test_helper"

# Behavior of LoyaltyCampaign::Metrics: given Enrollments, confirmed Stamps and
# Redemptions plus an effective_from_at era cutoff, assert the cumulative
# redemption funnel (Inscritos → Carimbaram → Resgataram) and the most-redeemed
# Prize. Asserted through the public interface only (the returned counts/Prize),
# never the grouped queries behind it. Read-only by design (ADR-0006),
# era-scoped (ADR-0005).
class LoyaltyCampaign::MetricsTest < ActiveSupport::TestCase
  setup do
    @merchant     = merchants(:one)
    @organization = @merchant.organization
    @campaign     = LoyaltyCampaign.create!(
      organization: @organization,
      merchant: @merchant,
      name: "Cartão Metrics",
      status: "active"
    )
    @cheap = @campaign.prizes.create!(name: "Café grátis", threshold: 5, position: 0)
    @combo = @campaign.prizes.create!(name: "Combo", threshold: 10, position: 1)
  end

  test "#funnel counts distinct Customers at each stage and is monotonic" do
    only_enrolled = customer("OnlyEnrolled")
    stamped_only  = customer("Stamped")
    redeemer      = customer("Redeemer")
    enroll(only_enrolled)
    enroll(stamped_only); stamp(stamped_only, 3)
    enroll(redeemer); stamp(redeemer, 6); redeem(redeemer, @cheap)

    funnel = @campaign.metrics.funnel

    assert_equal({ enrolled: 3, stamped: 2, redeemed: 1 }, funnel)
    assert_operator funnel[:enrolled], :>=, funnel[:stamped]
    assert_operator funnel[:stamped], :>=, funnel[:redeemed]
  end

  test "#funnel counts each Customer once regardless of how many Stamps/Redemptions" do
    busy = customer("Busy")
    enroll(busy)
    stamp(busy, 12)
    redeem(busy, @cheap)
    redeem(busy, @cheap)

    assert_equal({ enrolled: 1, stamped: 1, redeemed: 1 }, @campaign.metrics.funnel)
  end

  test "#funnel is era-scoped: activity before effective_from_at does not count" do
    old = customer("Old")
    enroll(old, created_at: 2.days.ago)
    stamp(old, 5, created_at: 2.days.ago)
    @campaign.update!(effective_from_at: 1.day.ago)

    assert_equal({ enrolled: 0, stamped: 0, redeemed: 0 }, @campaign.metrics.funnel)
  end

  test "#funnel stays monotonic when a returning Customer earns Stamps in a new era without re-enrolling" do
    returning = customer("Returning")
    enroll(returning, created_at: 2.days.ago) # enrollment predates the reset
    @campaign.update!(effective_from_at: 1.day.ago)
    stamp(returning, 3) # earned in the new era, enrollment row unchanged

    funnel = @campaign.metrics.funnel

    assert_equal 1, funnel[:stamped]
    assert_operator funnel[:enrolled], :>=, funnel[:stamped]
  end

  test "#funnel and #top_prize are empty/nil for a freshly-activated program" do
    assert_equal({ enrolled: 0, stamped: 0, redeemed: 0 }, @campaign.metrics.funnel)
    assert_nil @campaign.metrics.top_prize
  end

  test "#top_prize returns the most-redeemed Prize in the era" do
    a = customer("A"); enroll(a); stamp(a, 12)
    b = customer("B"); enroll(b); stamp(b, 12)
    redeem(a, @cheap)
    redeem(b, @cheap)
    redeem(a, @combo)

    assert_equal @cheap, @campaign.metrics.top_prize
  end

  test "#top_prize is era-scoped" do
    c = customer("C"); enroll(c); stamp(c, 12)
    redeem(c, @combo, created_at: 2.days.ago)
    @campaign.update!(effective_from_at: 1.day.ago)

    assert_nil @campaign.metrics.top_prize
  end

  test "#recent returns counts for the 7, 15 and 30 day windows in one call" do
    recent = @campaign.metrics.recent

    assert_equal [ 7, 15, 30 ], recent.keys
    recent.each_value do |window|
      assert_equal %i[active new returning stamps redemptions].sort, window.keys.sort
    end
  end

  test "#recent is all zeros for a freshly-activated program" do
    zero = { active: 0, new: 0, returning: 0, stamps: 0, redemptions: 0 }

    assert_equal({ 7 => zero, 15 => zero, 30 => zero }, @campaign.metrics.recent)
  end

  test "#recent classifies new vs returning per window via an era-floored prior-Stamp lookback" do
    @campaign.update!(effective_from_at: 40.days.ago)
    returner = customer("Returner")
    stamp_at(returner, 10.days.ago) # prior to the 7-day window, but within the era
    stamp_at(returner, 3.days.ago)  # in-window for all three windows

    recent = @campaign.metrics.recent

    # 7-day window: active now, and the 10-day Stamp falls *before* the window ⇒ returning.
    assert_equal({ active: 1, new: 0, returning: 1, stamps: 1, redemptions: 0 }, recent[7])
    # 15/30-day windows: both Stamps land inside the window, so there is no prior
    # in-era Stamp ⇒ new (acquisition), not returning.
    assert_equal({ active: 1, new: 1, returning: 0, stamps: 2, redemptions: 0 }, recent[15])
    assert_equal({ active: 1, new: 1, returning: 0, stamps: 2, redemptions: 0 }, recent[30])
  end

  test "#recent ignores prior Stamps before the era floor when classifying returning" do
    @campaign.update!(effective_from_at: 8.days.ago)
    reset = customer("Reset")
    stamp_at(reset, 10.days.ago) # before the era floor ⇒ excluded entirely
    stamp_at(reset, 3.days.ago)  # in the 7-day window

    # The pre-floor Stamp doesn't count, so there is no prior in-era Stamp ⇒ new.
    assert_equal({ active: 1, new: 1, returning: 0, stamps: 1, redemptions: 0 }, @campaign.metrics.recent[7])
  end

  test "#recent includes a Stamp landing exactly on the window's start edge" do
    # Freeze time so the edge is exact: the window is [now − Nd, now], inclusive at
    # the start edge, so a Stamp at exactly `now − 7d` is in-window (active), never
    # classified as a prior (returning) Stamp.
    freeze_time do
      @campaign.update!(effective_from_at: 60.days.ago)
      edge = customer("Edge")
      stamp_at(edge, 7.days.ago)

      window = @campaign.metrics.recent[7]

      assert_equal 1, window[:active]
      assert_equal 1, window[:stamps]
      assert_equal 0, window[:returning]
    end
  end

  test "#recent counts only in-window confirmed Stamps and Redemptions, excluding pending" do
    counter = customer("Counter"); enroll(counter)
    stamp_at(counter, 2.days.ago)   # in all three windows
    stamp_at(counter, 20.days.ago)  # only in the 30-day window
    pending_stamp(counter, 1.day.ago) # pending ⇒ never counted
    redeem(counter, @cheap, created_at: 2.days.ago)  # in all three windows
    redeem(counter, @cheap, created_at: 20.days.ago) # only in the 30-day window

    recent = @campaign.metrics.recent

    assert_equal 1, recent[7][:stamps]
    assert_equal 1, recent[7][:redemptions]
    assert_equal 2, recent[30][:stamps]
    assert_equal 2, recent[30][:redemptions]
    # The distinct Customer is counted once despite two confirmed Stamps.
    assert_equal 1, recent[30][:active]
  end

  private

  # A single confirmed Stamp at a precise `created_at` (its Visit day is derived
  # from that timestamp, keeping each Stamp on a distinct, unique day).
  def stamp_at(customer, created_at)
    visit = Visit.create!(customer: customer, merchant: @merchant, local_day: created_at.to_date)
    Stamp.create!(
      visit: visit, campaign: @campaign, customer: customer, merchant: @merchant,
      status: "confirmed", confirmed_at: created_at, created_at: created_at
    )
  end

  # A pending (unvalidated) Stamp — requires a code + expiry and must never count.
  def pending_stamp(customer, created_at)
    visit = Visit.create!(customer: customer, merchant: @merchant, local_day: created_at.to_date)
    Stamp.create!(
      visit: visit, campaign: @campaign, customer: customer, merchant: @merchant,
      status: "pending", code: "PEND01", expires_at: 1.day.from_now, created_at: created_at
    )
  end

  def customer(label)
    @seq = (@seq || 0) + 1
    Customer.create!(
      name: "Cust #{label}",
      phone: format("+555398888%04d", @seq), # valid BR mobile: +55 53 98888-####
      lgpd_opted_in_at: Time.current
    )
  end

  def enroll(customer, created_at: Time.current)
    @campaign.enrollments.create!(customer: customer, consented_at: Time.current, created_at: created_at)
  end

  # Confirmed Stamps each need their own Visit (unique per customer/merchant/day),
  # so back-date each to a distinct day. `created_at` places the batch before or
  # after effective_from_at for era-cutoff tests.
  def stamp(customer, count, created_at: Time.current)
    count.times do |i|
      visit = Visit.create!(customer: customer, merchant: @merchant, local_day: Date.current - i)
      Stamp.create!(
        visit: visit, campaign: @campaign, customer: customer, merchant: @merchant,
        status: "confirmed", confirmed_at: Time.current, created_at: created_at
      )
    end
  end

  def redeem(customer, prize, created_at: Time.current)
    @campaign.redemptions.create!(
      customer: customer, prize: prize, merchant: @merchant,
      threshold_snapshot: prize.threshold, created_at: created_at
    )
  end
end
