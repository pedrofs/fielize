require "test_helper"

class CampaignMerchantTest < ActiveSupport::TestCase
  test "rejects link to a LoyaltyCampaign" do
    cm = CampaignMerchant.new(campaign: campaigns(:cartao_calzados), merchant: merchants(:one))
    refute cm.valid?
    assert_includes cm.errors[:campaign], "must be an OrganizationCampaign"
  end

  test "accepts link to an OrganizationCampaign" do
    cm = CampaignMerchant.new(campaign: campaigns(:pasaporte), merchant: merchants(:two))
    assert cm.valid?, cm.errors.full_messages.inspect
  end

  test "(campaign_id, merchant_id) must be unique" do
    duplicate = CampaignMerchant.new(
      campaign: campaign_merchants(:pasaporte_calzados).campaign,
      merchant: campaign_merchants(:pasaporte_calzados).merchant
    )
    refute duplicate.valid?
    assert_includes duplicate.errors[:campaign_id], "has already been taken"
  end
end
