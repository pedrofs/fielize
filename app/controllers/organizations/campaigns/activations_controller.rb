# frozen_string_literal: true

class Organizations::Campaigns::ActivationsController < Organizations::BaseController
  before_action :set_campaign

  def create
    if @campaign.activate!
      redirect_to organizations_campaign_path(@campaign), notice: "Campanha ativada."
    else
      redirect_to organizations_campaign_path(@campaign), inertia: { errors: @campaign.errors }
    end
  end

  private

  def set_campaign
    @campaign = current_organization.campaigns
                                    .where(type: "OrganizationCampaign")
                                    .find(params[:campaign_id])
  end
end
