require "test_helper"

class PrizeTest < ActiveSupport::TestCase
  test "name is required" do
    prize = Prize.new(campaign: campaigns(:pasaporte), threshold: 5)
    refute prize.valid?
    assert_includes prize.errors[:name], "can't be blank"
  end

  test "LoyaltyCampaign prize requires positive integer threshold" do
    campaign = campaigns(:cartao_calzados)
    blank_threshold = Prize.new(campaign: campaign, name: "Café", threshold: nil)
    refute blank_threshold.valid?
    assert_includes blank_threshold.errors[:threshold], "must be a positive integer"

    zero_threshold = Prize.new(campaign: campaign, name: "Café", threshold: 0)
    refute zero_threshold.valid?
    assert_includes zero_threshold.errors[:threshold], "must be a positive integer"

    valid = Prize.new(campaign: campaign, name: "Café", threshold: 5)
    assert valid.valid?, valid.errors.full_messages.inspect
  end

  test "OrganizationCampaign cumulative prize requires positive integer threshold" do
    campaign = campaigns(:pasaporte) # cumulative
    blank_threshold = Prize.new(campaign: campaign, name: "Sorteio", threshold: nil)
    refute blank_threshold.valid?
    assert_includes blank_threshold.errors[:threshold], "must be a positive integer"

    valid = Prize.new(campaign: campaign, name: "Sorteio", threshold: 6)
    assert valid.valid?, valid.errors.full_messages.inspect
  end

  test "OrganizationCampaign simple prize must have blank threshold" do
    campaign = OrganizationCampaign.create!(
      organization: organizations(:one),
      name: "Simple Raffle",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "simple"
    )

    with_threshold = Prize.new(campaign: campaign, name: "iPhone", threshold: 5)
    refute with_threshold.valid?
    assert_includes with_threshold.errors[:threshold], "must be blank for simple OrganizationCampaign"

    valid = Prize.new(campaign: campaign, name: "iPhone", threshold: nil)
    assert valid.valid?, valid.errors.full_messages.inspect
  end

  test "ordered scope sorts by position" do
    campaign = campaigns(:pasaporte)
    p1 = campaign.prizes.create!(name: "Tier A", threshold: 6, position: 2)
    p0 = campaign.prizes.create!(name: "Tier B", threshold: 12, position: 1)
    ordered_ids = campaign.prizes.ordered.pluck(:id)
    # The fixture prize already exists at position 0; ours are 1 and 2.
    assert_equal ordered_ids.last(2), [ p0.id, p1.id ]
  end
end
