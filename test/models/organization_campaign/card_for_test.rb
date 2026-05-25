# frozen_string_literal: true

require "test_helper"

# Behavior of OrganizationCampaign#card_for: given the campaign's lifecycle
# state, the customer's confirmed Stamps, and the Raffle outcome, assert the
# resulting Card state / section / progress payload. State derivation:
#   active            → collecting   (ativas)
#   ended (not drawn) → awaiting_draw (ativas, "aguardando sorteio")
#   drawn, won, no redemption → won       (para_resgatar)
#   drawn, won, redeemed      → redeemed  (encerradas)
#   drawn, not a winner       → lost      (encerradas)
class OrganizationCampaign::CardForTest < ActiveSupport::TestCase
  setup do
    @org      = organizations(:one)
    @customer = customers(:maria)
  end

  # ----- cumulative progress -----

  test "cumulative collecting: active with partial merchants lands in ativas" do
    campaign = cumulative_campaign(thresholds: [ 2, 4 ])
    stamp_distinct_merchants(campaign, count: 1)

    card = campaign.card_for(customer: @customer)

    assert_equal "collecting", card.state
    assert_equal "ativas", card.section
    assert_equal "cumulative", card.progress[:kind]
    assert_equal 1, card.progress[:merchants_stamped]
    assert_equal 2, card.progress[:next_threshold]
    assert_equal(
      [
        { name: "Prêmio 2", threshold: 2, reached: false },
        { name: "Prêmio 4", threshold: 4, reached: false }
      ],
      card.progress[:tiers]
    )
  end

  test "cumulative crossing a threshold stays collecting (no sorteio, not won)" do
    campaign = cumulative_campaign(thresholds: [ 2, 4 ])
    stamp_distinct_merchants(campaign, count: 3)

    card = campaign.card_for(customer: @customer)

    assert_equal "collecting", card.state
    assert_equal "ativas", card.section
    assert_equal 3, card.progress[:merchants_stamped]
    assert_equal 4, card.progress[:next_threshold]
    assert card.progress[:tiers].first[:reached], "first tier should be reached"
    refute card.progress[:tiers].last[:reached], "higher tier should still be unreached"
  end

  test "cumulative all tiers reached has no next_threshold" do
    campaign = cumulative_campaign(thresholds: [ 2, 4 ])
    stamp_distinct_merchants(campaign, count: 4)

    card = campaign.card_for(customer: @customer)

    assert_equal "collecting", card.state
    assert_nil card.progress[:next_threshold]
    assert card.progress[:tiers].all? { |tier| tier[:reached] }
  end

  # ----- simple progress -----

  test "simple collecting: exposes entries and the draw date" do
    campaign = simple_campaign(day_cap: nil)
    stamp_on_distinct_days(campaign, count: 2)

    card = campaign.card_for(customer: @customer)

    assert_equal "collecting", card.state
    assert_equal "ativas", card.section
    assert_equal "simple", card.progress[:kind]
    assert_equal 2, card.progress[:entries]
    assert_equal campaign.ends_at, card.progress[:draw_at]
  end

  test "simple entries respect day_cap" do
    campaign = simple_campaign(day_cap: 1)
    stamp_same_day(campaign, count: 2)

    card = campaign.card_for(customer: @customer)

    assert_equal 1, card.progress[:entries], "day_cap=1 caps two same-day stamps to one entry"
  end

  # ----- lifecycle states (policy-independent raffle outcome) -----

  test "awaiting_draw: ended-not-drawn stays in ativas" do
    campaign = cumulative_campaign(thresholds: [ 2 ], status: "ended")
    stamp_distinct_merchants(campaign, count: 2)

    card = campaign.card_for(customer: @customer)

    assert_equal "awaiting_draw", card.state
    assert_equal "ativas", card.section
    assert_equal 2, card.progress[:merchants_stamped]
  end

  test "won: drawn winner without a redemption floats to para_resgatar" do
    campaign = cumulative_campaign(thresholds: [ 2 ], status: "drawn")
    draw_winner(campaign, customer: @customer)

    card = campaign.card_for(customer: @customer)

    assert_equal "won", card.state
    assert_equal "para_resgatar", card.section
  end

  test "redeemed: drawn winner with a redemption moves to encerradas" do
    campaign = cumulative_campaign(thresholds: [ 2 ], status: "drawn")
    draw_winner(campaign, customer: @customer, redeemed: true)

    card = campaign.card_for(customer: @customer)

    assert_equal "redeemed", card.state
    assert_equal "encerradas", card.section
  end

  test "lost: a drawn non-winner lands in encerradas" do
    campaign = cumulative_campaign(thresholds: [ 2 ], status: "drawn")
    draw_winner(campaign, customer: customers(:joao)) # someone else won

    card = campaign.card_for(customer: @customer)

    assert_equal "lost", card.state
    assert_equal "encerradas", card.section
  end

  test "simple drawn winner is won, same as cumulative" do
    campaign = simple_campaign(day_cap: nil, status: "drawn")
    draw_winner(campaign, customer: @customer)

    card = campaign.card_for(customer: @customer)

    assert_equal "won", card.state
    assert_equal "para_resgatar", card.section
  end

  private

  def cumulative_campaign(thresholds:, status: "active")
    campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Cumulativa #{SecureRandom.hex(4)}",
      starts_at: 2.months.ago, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: status
    )
    thresholds.each_with_index do |threshold, i|
      campaign.prizes.create!(name: "Prêmio #{threshold}", threshold: threshold, position: i)
    end
    campaign
  end

  def simple_campaign(day_cap:, status: "active")
    campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Simples #{SecureRandom.hex(4)}",
      starts_at: 2.months.ago, ends_at: 1.month.from_now,
      entry_policy: "simple", day_cap: day_cap, status: status
    )
    campaign.prizes.create!(name: "Sorteio", threshold: nil, position: 0)
    campaign
  end

  # Stamp the customer at `count` distinct, freshly created Merchants — drives
  # the cumulative distinct-merchant tally.
  def stamp_distinct_merchants(campaign, count:)
    count.times do |i|
      merchant = Merchant.create!(
        organization: @org, name: "M #{SecureRandom.hex(3)}",
        slug: "m-#{SecureRandom.hex(3)}", address: "x",
        latitude: -32.5, longitude: -53.3
      )
      CampaignMerchant.create!(organization_campaign: campaign, merchant: merchant)
      visit = Visit.create!(customer: @customer, merchant: merchant, local_day: Date.current - i)
      Stamp.create!(
        visit: visit, campaign: campaign, customer: @customer,
        merchant: merchant, status: "confirmed", confirmed_at: Time.current
      )
    end
  end

  # Stamp the customer on `count` distinct days at one merchant — simple entries
  # group by stamp day, so each day is one entry (uncapped).
  def stamp_on_distinct_days(campaign, count:)
    merchant = merchants(:one)
    count.times do |i|
      day = Date.current - (i + 2)
      visit = Visit.create!(customer: @customer, merchant: merchant, local_day: day)
      Stamp.create!(
        visit: visit, campaign: campaign, customer: @customer, merchant: merchant,
        status: "confirmed", confirmed_at: Time.current, created_at: day.to_time
      )
    end
  end

  # Stamp the customer `count` times on the same day at distinct merchants — the
  # per-day Visit unique index forbids reusing a merchant, so vary the merchant
  # while keeping the stamp day constant to exercise day_cap.
  def stamp_same_day(campaign, count:)
    count.times do
      merchant = Merchant.create!(
        organization: @org, name: "M #{SecureRandom.hex(3)}",
        slug: "m-#{SecureRandom.hex(3)}", address: "x",
        latitude: -32.5, longitude: -53.3
      )
      visit = Visit.create!(customer: @customer, merchant: merchant, local_day: Date.current)
      Stamp.create!(
        visit: visit, campaign: campaign, customer: @customer, merchant: merchant,
        status: "confirmed", confirmed_at: Time.current, created_at: Time.current
      )
    end
  end

  def draw_winner(campaign, customer:, redeemed: false)
    prize  = campaign.prizes.first
    raffle = Raffle.create!(
      prize: prize, campaign: campaign, winner_customer: customer,
      status: "drawn", seed: SecureRandom.hex(8), drawn_at: Time.current
    )
    if redeemed
      Redemption.create!(campaign: campaign, customer: customer, prize: prize, raffle: raffle)
    end
    raffle
  end
end
