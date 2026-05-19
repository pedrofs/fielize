require "test_helper"

class OrganizationCampaign::DrawableTest < ActiveSupport::TestCase
  setup do
    @org = organizations(:one)
  end

  # ----- guards -----

  test "draw! is a no-op on draft" do
    campaign = build_ended_campaign(prize_count: 1)
    campaign.update_columns(status: "draft")

    refute campaign.draw!
    assert campaign.draft?
    assert_equal 0, campaign.raffles.count
  end

  test "draw! is a no-op on active" do
    campaign = build_ended_campaign(prize_count: 1)
    campaign.update_columns(status: "active")

    refute campaign.draw!
    assert campaign.active?
    assert_equal 0, campaign.raffles.count
  end

  test "draw! is a no-op when the campaign has no prizes" do
    campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "No prizes",
      starts_at: 2.days.ago, ends_at: 1.day.ago,
      entry_policy: "cumulative",
      status: "ended"
    )

    refute campaign.draw!
    assert campaign.ended?
    assert_equal 0, campaign.raffles.count
  end

  test "draw! is a no-op on already drawn campaigns" do
    campaign = build_ended_campaign(prize_count: 1)
    seed_customers_with_stamps(campaign, customer_count: 1, merchants_per_customer: 1)

    assert campaign.draw!
    assert campaign.drawn?
    initial_raffle_ids = campaign.raffles.pluck(:id)

    refute campaign.draw!
    assert_equal initial_raffle_ids.sort, campaign.raffles.pluck(:id).sort
  end

  # ----- happy path -----

  test "draw! creates one Raffle per Prize and flips status to drawn" do
    campaign = build_ended_campaign(prize_count: 3, thresholds: [ 1, 2, 3 ])
    seed_customers_with_stamps(campaign, customer_count: 5, merchants_per_customer: 3)

    assert campaign.draw!
    assert campaign.drawn?
    assert_equal 3, campaign.raffles.count
    campaign.prizes.each do |prize|
      assert prize.reload.raffle.present?, "expected Raffle for prize #{prize.name}"
    end
  end

  test "draw! processes Prizes in position order" do
    campaign = build_ended_campaign(prize_count: 3, thresholds: [ 1, 2, 3 ])
    seed_customers_with_stamps(campaign, customer_count: 4, merchants_per_customer: 3)

    assert campaign.draw!
    raffles_in_creation_order = campaign.raffles.order(:created_at).to_a
    position_order = raffles_in_creation_order.map { |r| r.prize.position }
    assert_equal position_order.sort, position_order,
      "expected raffles to be created in Prize.position order"
  end

  test "draw! never lets the same Customer win more than one Prize" do
    campaign = build_ended_campaign(prize_count: 3, thresholds: [ 1, 1, 1 ])
    seed_customers_with_stamps(campaign, customer_count: 5, merchants_per_customer: 3)

    assert campaign.draw!
    winners = campaign.raffles.where(status: "drawn").pluck(:winner_customer_id)
    assert_equal winners, winners.uniq, "the same Customer cannot win more than one Prize"
  end

  test "draw! records RaffleEntry rows that snapshot each pool" do
    campaign = build_ended_campaign(prize_count: 2, thresholds: [ 1, 2 ])
    seed_customers_with_stamps(campaign, customer_count: 3, merchants_per_customer: 2)

    assert campaign.draw!
    raffles = campaign.raffles.includes(:raffle_entries).to_a
    assert raffles.all? { |r| r.raffle_entries.any? || r.no_winner? },
      "every drawn Raffle should have entries snapshotted"
  end

  test "draw! materialises a no_winner Raffle when a Prize's pool is empty, and siblings still draw" do
    campaign = build_ended_campaign(prize_count: 2, thresholds: [ 1, 99 ])
    seed_customers_with_stamps(campaign, customer_count: 3, merchants_per_customer: 2)

    assert campaign.draw!
    by_threshold = campaign.raffles.includes(:prize).index_by { |r| r.prize.threshold }

    assert_equal "drawn",     by_threshold[1].status
    assert_equal "no_winner", by_threshold[99].status
    assert_nil by_threshold[99].winner_customer_id
    assert by_threshold[99].seed.present?
    assert by_threshold[99].drawn_at.present?
  end

  test "draw! records a seed and drawn_at on every Raffle for replay" do
    campaign = build_ended_campaign(prize_count: 2, thresholds: [ 1, 2 ])
    seed_customers_with_stamps(campaign, customer_count: 3, merchants_per_customer: 2)

    assert campaign.draw!
    campaign.raffles.each do |raffle|
      assert raffle.seed.present?
      assert raffle.drawn_at.present?
    end
  end

  test "draw! produces a deterministic winner given the stored seed" do
    campaign = build_ended_campaign(prize_count: 1, thresholds: [ 1 ])
    seed_customers_with_stamps(campaign, customer_count: 5, merchants_per_customer: 2)

    assert campaign.draw!
    raffle = campaign.raffles.first
    pool = Raffle::PoolBuilder.call(prize: raffle.prize, exclude_customer_ids: [])
    replay = Raffle::Drawer.call(entries: pool, seed: raffle.seed)
    assert_equal raffle.winner_customer_id, replay
  end

  test "draw! works for simple campaigns: every Prize gets the same pool" do
    campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Simple Ended #{SecureRandom.hex(4)}",
      starts_at: 2.days.ago, ends_at: 1.day.ago,
      entry_policy: "simple",
      status: "ended"
    )
    campaign.prizes.create!(name: "P1", threshold: nil, position: 0)
    campaign.prizes.create!(name: "P2", threshold: nil, position: 1)
    seed_customers_with_stamps(campaign, customer_count: 4, merchants_per_customer: 2)

    assert campaign.draw!
    statuses = campaign.raffles.pluck(:status).uniq
    assert_equal [ "drawn" ], statuses
    winners = campaign.raffles.pluck(:winner_customer_id)
    assert_equal winners, winners.uniq
  end

  private

  def build_ended_campaign(prize_count:, thresholds: nil)
    thresholds ||= Array.new(prize_count) { |i| i + 1 }
    campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Drawable #{SecureRandom.hex(4)}",
      starts_at: 2.days.ago, ends_at: 1.day.ago,
      entry_policy: "cumulative",
      status: "ended"
    )
    prize_count.times do |i|
      campaign.prizes.create!(name: "Tier #{i}", threshold: thresholds[i], position: i)
    end
    campaign
  end

  def seed_customers_with_stamps(campaign, customer_count:, merchants_per_customer:)
    merchants = Array.new(merchants_per_customer) do |i|
      m = Merchant.create!(
        organization: @org,
        name: "DM #{SecureRandom.hex(2)}-#{i}",
        slug: "dm-#{SecureRandom.hex(3)}",
        address: "x", latitude: -32.5, longitude: -53.3
      )
      CampaignMerchant.create!(organization_campaign: campaign, merchant: m)
      m
    end

    customer_count.times do |i|
      customer = Customer.create!(
        phone: format("+55539888%05d", rand(0..99_999)),
        name: "Cust #{i}",
        lgpd_opted_in_at: Time.current
      )
      merchants.each do |merchant|
        visit = Visit.create!(customer: customer, merchant: merchant, local_day: Date.current)
        Stamp.create!(
          visit: visit, campaign: campaign, customer: customer, merchant: merchant,
          status: "confirmed", confirmed_at: Time.current
        )
      end
    end
  end
end
