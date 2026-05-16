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

  def destroy
    join = @campaign.campaign_merchants.find_by(merchant_id: params[:id])

    if join.nil?
      redirect_to organizations_campaign_path(@campaign), alert: "Lojista não está nesta campanha."
    elsif join.destroy
      redirect_to organizations_campaign_path(@campaign), notice: "Lojista removido."
    else
      redirect_to organizations_campaign_path(@campaign), alert: join.errors[:base].first
    end
  end

  private

  def set_campaign
    @campaign = current_organization.campaigns
                                    .where(type: "OrganizationCampaign")
                                    .find(params[:campaign_id])
  end
end
