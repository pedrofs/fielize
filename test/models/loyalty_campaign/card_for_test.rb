# frozen_string_literal: true

require "test_helper"

# Behavior of LoyaltyCampaign#card_for: given a customer's spend-down balance
# against the prize tiers, assert the resulting Card state / section / progress.
class LoyaltyCampaign::CardForTest < ActiveSupport::TestCase
  setup do
    @merchant     = merchants(:one)
    @organization = @merchant.organization
    @customer     = customers(:maria)
    @campaign     = LoyaltyCampaign.create!(
      organization: @organization,
      merchant: @merchant,
      name: "Cartão Café",
      status: "active"
    )
    @campaign.prizes.create!(name: "Café grátis", threshold: 5, position: 0)
    @campaign.prizes.create!(name: "Combo", threshold: 10, position: 1)
  end

  test "collecting: balance below the minimum threshold lands in ativas" do
    add_confirmed_stamps(3)

    card = @campaign.card_for(customer: @customer)

    assert_equal "collecting", card.state
    assert_equal "ativas", card.section
    assert_equal "loyalty", card.progress[:kind]
    assert_equal 3, card.progress[:balance]
    assert_equal 5, card.progress[:next_threshold]
    assert_equal(
      [
        { name: "Café grátis", threshold: 5, reached: false },
        { name: "Combo", threshold: 10, reached: false }
      ],
      card.progress[:tiers]
    )
  end

  test "redeemable: at/above the minimum threshold floats to para_resgatar but still shows higher tiers" do
    add_confirmed_stamps(5)

    card = @campaign.card_for(customer: @customer)

    assert_equal "redeemable", card.state
    assert_equal "para_resgatar", card.section
    assert_equal 5, card.progress[:balance]
    assert_equal 10, card.progress[:next_threshold]
    assert card.progress[:tiers].first[:reached]
    refute card.progress[:tiers].last[:reached]
  end

  test "redeemable: all tiers reached has no next_threshold" do
    add_confirmed_stamps(10)

    card = @campaign.card_for(customer: @customer)

    assert_equal "redeemable", card.state
    assert_nil card.progress[:next_threshold]
    assert card.progress[:tiers].all? { |tier| tier[:reached] }
  end

  test "disabled: an inactive campaign lands in encerradas even with a redeemable balance" do
    add_confirmed_stamps(7)
    @campaign.update!(status: "ended")

    card = @campaign.card_for(customer: @customer)

    assert_equal "disabled", card.state
    assert_equal "encerradas", card.section
  end

  private

  # balance_for counts confirmed Stamps. Each Stamp needs its own Visit, and
  # Visits are unique per (customer, merchant, local_day) — so back-date each
  # one to a distinct day (offset +2 to clear the maria_at_calzados fixture).
  def add_confirmed_stamps(count)
    count.times do |i|
      visit = Visit.create!(customer: @customer, merchant: @merchant, local_day: Date.current - (i + 2))
      Stamp.create!(
        visit: visit, campaign: @campaign, customer: @customer, merchant: @merchant,
        status: "confirmed", confirmed_at: Time.current
      )
    end
  end
end
