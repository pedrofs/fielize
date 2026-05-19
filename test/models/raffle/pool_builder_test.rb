require "test_helper"

class Raffle::PoolBuilderTest < ActiveSupport::TestCase
  setup do
    @org = organizations(:one)
  end

  # ----- cumulative -----

  test "cumulative: includes 1 entry per Customer whose distinct-merchant count meets the threshold" do
    campaign = create_campaign(entry_policy: "cumulative")
    p3 = campaign.prizes.create!(name: "Tier", threshold: 3, position: 0)

    merchants = build_merchants(campaign, count: 3)
    cust = build_customer
    stamp_at_each(merchants, customer: cust, campaign: campaign)

    pool = Raffle::PoolBuilder.call(prize: p3, exclude_customer_ids: [])

    assert_equal [ cust.id ], pool
  end

  test "cumulative: excludes Customers below the threshold" do
    campaign = create_campaign(entry_policy: "cumulative")
    p5 = campaign.prizes.create!(name: "Tier", threshold: 5, position: 0)

    merchants = build_merchants(campaign, count: 4)
    cust = build_customer
    stamp_at_each(merchants, customer: cust, campaign: campaign)

    pool = Raffle::PoolBuilder.call(prize: p5, exclude_customer_ids: [])

    assert_empty pool
  end

  test "cumulative: honours exclude_customer_ids" do
    campaign = create_campaign(entry_policy: "cumulative")
    p3 = campaign.prizes.create!(name: "Tier", threshold: 3, position: 0)

    merchants = build_merchants(campaign, count: 3)
    winner = build_customer(phone: "+5553988880100", name: "Winner")
    other  = build_customer(phone: "+5553988880200", name: "Other")
    stamp_at_each(merchants, customer: winner, campaign: campaign)
    stamp_at_each(merchants, customer: other,  campaign: campaign)

    pool = Raffle::PoolBuilder.call(
      prize: p3, exclude_customer_ids: [ winner.id ]
    )

    assert_equal [ other.id ], pool
  end

  # ----- simple -----

  test "simple: produces stamp-count entries per Customer with day_cap applied per day" do
    campaign = create_campaign(entry_policy: "simple", day_cap: 1)
    prize = campaign.prizes.create!(name: "Sorteio", threshold: nil, position: 0)

    merchants = build_merchants(campaign, count: 2)
    cust = build_customer
    # Two confirmed stamps same day (different merchants) → capped to 1 per day.
    stamp_at_each(merchants, customer: cust, campaign: campaign)

    pool = Raffle::PoolBuilder.call(prize: prize, exclude_customer_ids: [])

    assert_equal [ cust.id ], pool
  end

  test "simple: without day_cap, produces one entry per confirmed stamp" do
    campaign = create_campaign(entry_policy: "simple", day_cap: nil)
    prize = campaign.prizes.create!(name: "Sorteio", threshold: nil, position: 0)

    merchants = build_merchants(campaign, count: 3)
    cust = build_customer
    stamp_at_each(merchants, customer: cust, campaign: campaign)

    pool = Raffle::PoolBuilder.call(prize: prize, exclude_customer_ids: [])

    assert_equal [ cust.id, cust.id, cust.id ], pool
  end

  test "simple: honours exclude_customer_ids" do
    campaign = create_campaign(entry_policy: "simple", day_cap: nil)
    prize = campaign.prizes.create!(name: "Sorteio", threshold: nil, position: 0)

    merchants = build_merchants(campaign, count: 2)
    winner = build_customer(phone: "+5553988880101", name: "W")
    other  = build_customer(phone: "+5553988880201", name: "O")
    stamp_at_each(merchants, customer: winner, campaign: campaign)
    stamp_at_each(merchants, customer: other,  campaign: campaign)

    pool = Raffle::PoolBuilder.call(
      prize: prize, exclude_customer_ids: [ winner.id ]
    )

    assert_equal [ other.id, other.id ], pool
  end

  test "simple: capped per day, summed across days" do
    campaign = create_campaign(entry_policy: "simple", day_cap: 1)
    prize = campaign.prizes.create!(name: "Sorteio", threshold: nil, position: 0)

    merchants = build_merchants(campaign, count: 2)
    cust = build_customer
    stamp_at_each(merchants, customer: cust, campaign: campaign, day: Date.current)
    stamp_at_each(merchants, customer: cust, campaign: campaign, day: Date.current - 1)

    pool = Raffle::PoolBuilder.call(prize: prize, exclude_customer_ids: [])

    # 1 entry per day × 2 days = 2 entries.
    assert_equal 2, pool.size
    assert_equal [ cust.id ], pool.uniq
  end

  private

  def create_campaign(entry_policy:, day_cap: nil)
    OrganizationCampaign.create!(
      organization: @org,
      name: "PB #{SecureRandom.hex(4)}",
      starts_at: 1.day.ago, ends_at: 1.month.from_now,
      entry_policy: entry_policy, day_cap: day_cap,
      status: "active"
    )
  end

  def build_merchants(campaign, count:)
    Array.new(count) do |i|
      m = Merchant.create!(
        organization: @org, name: "PB M#{SecureRandom.hex(2)}-#{i}", slug: "pb-m-#{SecureRandom.hex(3)}",
        address: "X", latitude: -32.5, longitude: -53.3
      )
      CampaignMerchant.create!(organization_campaign: campaign, merchant: m)
      m
    end
  end

  def build_customer(phone: nil, name: "C")
    phone ||= format("+55539888%05d", rand(0..99_999))
    Customer.create!(phone: phone, name: name, lgpd_opted_in_at: Time.current)
  end

  def stamp_at_each(merchants, customer:, campaign:, day: Date.current)
    merchants.each do |m|
      v = Visit.create!(customer: customer, merchant: m, local_day: day)
      stamp = Stamp.create!(
        visit: v, campaign: campaign, customer: customer, merchant: m,
        status: "confirmed", confirmed_at: Time.current
      )
      # Pin created_at to the visit's day so `DATE(created_at)` grouping
      # in PoolBuilder reflects the intended scenario, not the test's
      # clock.
      stamp.update_columns(created_at: day.to_time.change(hour: 12))
    end
  end
end
