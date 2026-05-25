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

  private

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
