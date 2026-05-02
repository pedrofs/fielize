# frozen_string_literal: true

class Organizations::Campaigns::TerminationsController < Organizations::BaseController
  before_action :set_campaign

  def create
    if @campaign.end!
      redirect_to organizations_campaign_path(@campaign), notice: "Campanha encerrada."
    else
      redirect_to organizations_campaign_path(@campaign),
        alert: "Apenas campanhas ativas podem ser encerradas."
    end
  end

  private

  def set_campaign
    @campaign = current_organization.campaigns
                                    .where(type: "OrganizationCampaign")
                                    .find(params[:campaign_id])
  end
end
