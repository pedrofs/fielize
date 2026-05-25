require "test_helper"

class LoyaltyCampaignTest < ActiveSupport::TestCase
  setup do
    @merchant = merchants(:one)
    @valid_attrs = {
      organization: @merchant.organization,
      merchant: @merchant,
      name: "LC Test",
      status: "active"
    }
  end

  test "merchant_id is required" do
    campaign = LoyaltyCampaign.new(@valid_attrs.merge(merchant: nil))
    refute campaign.valid?
    assert_includes campaign.errors[:merchant_id], "can't be blank"
  end

  test "entry_policy must be blank" do
    campaign = LoyaltyCampaign.new(@valid_attrs.merge(entry_policy: "cumulative"))
    refute campaign.valid?
    assert_includes campaign.errors[:entry_policy], "must be blank for LoyaltyCampaign"
  end

  test "balance_for: confirmed stamps minus redemptions snapshots" do
    campaign = campaigns(:cartao_calzados)
    customer = customers(:maria)
    # Maria has 1 confirmed stamp (cartao_calzados) per fixtures.
    assert_equal 1, campaign.balance_for(customer)
  end

  test "balance_for ignores stamps before effective_from_at" do
    campaign = campaigns(:cartao_calzados)
    customer = customers(:maria)
    # Cut off everything before now → balance becomes 0 (existing stamp was created before).
    campaign.update!(effective_from_at: Time.current)
    travel 1.second do
      assert_equal 0, campaign.balance_for(customer)
    end
  end

  test "balance_for subtracts threshold_snapshot of redemptions" do
    campaign = campaigns(:cartao_calzados)
    customer = customers(:maria)
    prize = prizes(:cartao_cafe) # threshold 5

    Redemption.create!(
      customer: customer,
      campaign: campaign,
      prize: prize,
      merchant: campaign.merchant,
      threshold_snapshot: 5
    )
    # 1 confirmed stamp - 5 redemption = -4 (negative balance allowed; reflects over-spend).
    assert_equal(-4, campaign.balance_for(customer))
  end

  test "preview_card is a zero-balance collecting card built from prizes, tiers ordered by threshold" do
    campaign = LoyaltyCampaign.create!(@valid_attrs.merge(
      name: "Preview LC", slug: "preview-lc", status: "draft"
    ))
    campaign.prizes.create!(name: "Brinde", threshold: 10)
    campaign.prizes.create!(name: "Café", threshold: 3)

    card = campaign.preview_card
    progress = card.progress

    assert_nil card.customer
    assert_equal "collecting", card.state
    assert_equal "loyalty", progress[:kind]
    assert_equal 0, progress[:balance]
    assert_equal 3, progress[:next_threshold]
    assert_equal [ 3, 10 ], progress[:tiers].map { |t| t[:threshold] }
    assert progress[:tiers].none? { |t| t[:reached] }
  end

  test "preview_card with no prizes returns empty tiers and nil next_threshold without crashing" do
    campaign = LoyaltyCampaign.create!(@valid_attrs.merge(
      name: "Empty LC", slug: "empty-lc", status: "draft"
    ))

    card = campaign.preview_card

    assert_equal "collecting", card.state
    assert_equal 0, card.progress[:balance]
    assert_equal [], card.progress[:tiers]
    assert_nil card.progress[:next_threshold]
  end

  test "preview_card stays collecting regardless of campaign status" do
    # card_for on a non-active campaign would be "disabled"; the preview ignores
    # status so a draft renders the brand-new-customer view, not a dead card.
    campaign = LoyaltyCampaign.create!(@valid_attrs.merge(
      name: "Draft LC", slug: "draft-lc", status: "draft"
    ))
    campaign.prizes.create!(name: "Café", threshold: 5)

    assert_equal "collecting", campaign.preview_card.state
  end

  test "disable! sets status ended and optionally effective_from_at" do
    campaign = campaigns(:cartao_calzados)
    campaign.disable!
    assert campaign.ended?
    assert_nil campaign.effective_from_at

    campaign.update!(status: "active", effective_from_at: nil)
    campaign.disable!(reset: true)
    assert campaign.ended?
    assert_not_nil campaign.effective_from_at
  end
end
