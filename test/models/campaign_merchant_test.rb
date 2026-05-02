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
end
