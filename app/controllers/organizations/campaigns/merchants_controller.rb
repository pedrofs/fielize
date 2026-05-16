# frozen_string_literal: true

class Organizations::Campaigns::MerchantsController < Organizations::BaseController
  before_action :set_campaign

  def create
    if ActiveModel::Type::Boolean.new.cast(params[:bulk])
      @campaign.attach_all_missing_merchants!
    else
      merchant = current_organization.merchants.find_by(id: params[:merchant_id])
      CampaignMerchant.find_or_create_by(organization_campaign: @campaign, merchant: merchant) if merchant
    end

    redirect_to organizations_campaign_path(@campaign)
  end

  private

  def set_campaign
    @campaign = current_organization.campaigns
                                    .where(type: "OrganizationCampaign")
                                    .find(params[:campaign_id])
  end
end
