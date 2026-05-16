require "test_helper"

class CampaignMerchantTest < ActiveSupport::TestCase
  test "rejects FK pointing to a LoyaltyCampaign row" do
    # With `belongs_to :organization_campaign` (class_name auto-resolves to
    # OrganizationCampaign), assigning a LoyaltyCampaign-typed Campaign causes
    # the association lookup to miss on reload, so the presence-required
    # belongs_to fails validation.
    cm = CampaignMerchant.new(merchant: merchants(:one))
    cm.campaign_id = campaigns(:cartao_calzados).id
    refute cm.valid?
    assert_includes cm.errors[:organization_campaign], "must exist"
  end

  test "accepts link to an OrganizationCampaign" do
    cm = CampaignMerchant.new(organization_campaign: campaigns(:pasaporte), merchant: merchants(:two))
    assert cm.valid?, cm.errors.full_messages.inspect
  end

  test "(campaign_id, merchant_id) must be unique" do
    duplicate = CampaignMerchant.new(
      organization_campaign: campaign_merchants(:pasaporte_calzados).organization_campaign,
      merchant: campaign_merchants(:pasaporte_calzados).merchant
    )
    refute duplicate.valid?
    assert_includes duplicate.errors[:merchant_id], "has already been taken"
  end

  # ----- prevent_removal_when_campaign_locked -----

  test "destroy succeeds when campaign is draft" do
    campaign = build_campaign
    campaign.merchants << merchants(:one)
    campaign.merchants << merchants(:two)
    assert campaign.draft?

    join = campaign.campaign_merchants.find_by!(merchant: merchants(:two))
    assert join.destroy
    refute_includes campaign.reload.merchant_ids, merchants(:two).id
  end

  test "destroy is rejected when campaign is active" do
    campaign = build_campaign
    campaign.merchants << merchants(:one)
    campaign.merchants << merchants(:two)
    campaign.activate!
    assert campaign.active?

    join = campaign.campaign_merchants.find_by!(merchant: merchants(:two))
    refute join.destroy
    assert join.errors[:base].any? { |e| e.include?("ativa") || e.include?("encerrada") }
    assert_includes campaign.reload.merchant_ids, merchants(:two).id
  end

  test "destroy is rejected when campaign is ended" do
    campaign = build_campaign
    campaign.merchants << merchants(:one)
    campaign.merchants << merchants(:two)
    campaign.activate!
    campaign.end!
    assert campaign.ended?

    join = campaign.campaign_merchants.find_by!(merchant: merchants(:two))
    refute join.destroy
    assert join.errors[:base].any? { |e| e.include?("ativa") || e.include?("encerrada") }
    assert_includes campaign.reload.merchant_ids, merchants(:two).id
  end

  private

  def build_campaign
    OrganizationCampaign.create!(
      organization: organizations(:one),
      name: "Lock Guard Test",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      prizes_attributes: [ { name: "Tier", threshold: 6, position: 0 } ]
    )
  end
end
