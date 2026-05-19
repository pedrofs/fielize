# frozen_string_literal: true

class Organizations::Campaigns::RafflesController < Organizations::BaseController
  before_action :set_campaign

  def create
    if @campaign.draw!
      redirect_to organizations_campaign_path(@campaign), notice: "Sorteio realizado."
    else
      redirect_to organizations_campaign_path(@campaign),
        alert: "Apenas campanhas encerradas com prêmios podem ser sorteadas."
    end
  end

  private

  def set_campaign
    @campaign = current_organization.campaigns
                                    .where(type: "OrganizationCampaign")
                                    .find(params[:campaign_id])
  end
end
