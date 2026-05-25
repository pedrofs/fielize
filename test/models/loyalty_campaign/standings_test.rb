# frozen_string_literal: true

require "test_helper"

# Behavior of LoyaltyCampaign::Standings: given confirmed Stamps, Redemptions
# and an effective_from_at era cutoff, assert which Customers land in the
# "Pode resgatar agora" (#redeemable) and "Quase lá" (#near_reward) buckets,
# each carrying spend-down balance / missing. Asserted through the public
# interface only (the resulting buckets), never the grouped queries behind it.
class LoyaltyCampaign::StandingsTest < ActiveSupport::TestCase
  setup do
    @merchant     = merchants(:one)
    @organization = @merchant.organization
    @campaign     = LoyaltyCampaign.create!(
      organization: @organization,
      merchant: @merchant,
      name: "Cartão Standings",
      status: "active"
    )
    @cheap = @campaign.prizes.create!(name: "Café grátis", threshold: 5, position: 0)
    @combo = @campaign.prizes.create!(name: "Combo", threshold: 10, position: 1)
  end

  test "#redeemable lists Customers whose balance reached the cheapest threshold, with balance" do
    far     = customer("Far")
    exactly = customer("Exactly")
    over    = customer("Over")
    stamp(far, 3)
    stamp(exactly, 5)
    stamp(over, 7)

    rows = @campaign.redeemable
    by_customer = rows.index_by(&:customer)

    assert_equal [ exactly, over ].to_set, by_customer.keys.to_set
    assert_equal 5, by_customer[exactly].balance
    assert_equal 7, by_customer[over].balance
  end

  test "balance exactly at the cheapest threshold counts as redeemable, not near" do
    at = customer("At")
    stamp(at, 5)

    assert_includes @campaign.redeemable.map(&:customer), at
    refute_includes @campaign.near_reward(within: 2).map(&:customer), at
  end

  test "#near_reward lists only collecting Customers within `within`, sorted by missing ascending" do
    one_away = customer("OneAway")
    two_away = customer("TwoAway")
    three_away = customer("ThreeAway")
    stamp(one_away, 4)   # missing 1
    stamp(two_away, 3)   # missing 2
    stamp(three_away, 2) # missing 3 — outside within: 2

    rows = @campaign.near_reward(within: 2)

    assert_equal [ one_away, two_away ], rows.map(&:customer)
    assert_equal [ 1, 2 ], rows.map(&:missing)
  end

  test "#near_reward boundary is inclusive: exactly `within` away is included, one more is excluded" do
    boundary = customer("Boundary")
    beyond   = customer("Beyond")
    stamp(boundary, 3) # missing 2 — included at within: 2
    stamp(beyond, 2)   # missing 3 — excluded

    customers = @campaign.near_reward(within: 2).map(&:customer)

    assert_includes customers, boundary
    refute_includes customers, beyond
  end

  test "the two buckets are mutually exclusive" do
    redeemable = customer("Redeemable")
    near       = customer("Near")
    stamp(redeemable, 6)
    stamp(near, 4)

    in_redeemable = @campaign.redeemable.map(&:customer)
    in_near       = @campaign.near_reward(within: 2).map(&:customer)

    assert_empty (in_redeemable & in_near)
  end

  test "a Customer redeemable for the cheapest but short of a higher tier is in redeemable, never near" do
    between = customer("Between") # balance 7: past cheapest (5), short of combo (10)
    stamp(between, 7)

    assert_includes @campaign.redeemable.map(&:customer), between
    refute_includes @campaign.near_reward(within: 5).map(&:customer), between
  end

  test "confirmed Stamps before effective_from_at do not count" do
    customer = customer("Old")
    stamp(customer, 5, created_at: 2.days.ago)
    @campaign.update!(effective_from_at: 1.day.ago)

    refute_includes @campaign.redeemable.map(&:customer), customer
    refute_includes @campaign.near_reward(within: 5).map(&:customer), customer
  end

  test "pending Stamps never count toward a balance" do
    customer = customer("Pending")
    stamp(customer, 4)            # confirmed: balance 4, near
    pending_stamp(customer)       # would push to 5 if it counted

    rows = @campaign.near_reward(within: 2)
    assert_equal 1, rows.find { |r| r.customer == customer }&.missing
    refute_includes @campaign.redeemable.map(&:customer), customer
  end

  test "balance reflects spend-down: a Redemption drops balance and moves the Customer's bucket" do
    customer = customer("Spender")
    stamp(customer, 6) # redeemable

    assert_includes @campaign.redeemable.map(&:customer), customer

    @campaign.redemptions.create!(
      customer: customer, prize: @cheap, merchant: @merchant,
      threshold_snapshot: @cheap.threshold
    )

    # 6 - 5 = 1 → collecting, 4 short of cheapest.
    fresh = LoyaltyCampaign.find(@campaign.id)
    refute_includes fresh.redeemable.map(&:customer), customer
    near = fresh.near_reward(within: 5).find { |r| r.customer == customer }
    assert_equal 1, near.balance
    assert_equal 4, near.missing
  end

  test "an active program with no Stamps yields empty buckets, not an error" do
    assert_empty @campaign.redeemable
    assert_empty @campaign.near_reward(within: 2)
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

  # Confirmed Stamps each need their own Visit (unique per customer/merchant/day),
  # so back-date each to a distinct day. `created_at` lets era-cutoff tests place
  # the whole batch before/after effective_from_at.
  def stamp(customer, count, created_at: Time.current)
    count.times do |i|
      visit = Visit.create!(customer: customer, merchant: @merchant, local_day: Date.current - i)
      Stamp.create!(
        visit: visit, campaign: @campaign, customer: customer, merchant: @merchant,
        status: "confirmed", confirmed_at: Time.current, created_at: created_at
      )
    end
  end

  def pending_stamp(customer)
    visit = Visit.create!(customer: customer, merchant: @merchant, local_day: Date.current - 90)
    Stamp.create!(
      visit: visit, campaign: @campaign, customer: customer, merchant: @merchant,
      status: "pending", code: "ABC123", expires_at: 1.hour.from_now
    )
  end
end
