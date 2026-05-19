# frozen_string_literal: true

class Organizations::Campaigns::Raffles::RedemptionsController < Organizations::BaseController
  before_action :set_campaign_and_raffle

  def create
    @campaign.redeem!(customer: @raffle.winner_customer, prize: @raffle.prize, by: Current.user)
    redirect_to organizations_campaign_path(@campaign), notice: "Entrega registrada."
  rescue ActiveRecord::RecordInvalid
    redirect_to organizations_campaign_path(@campaign),
      alert: "Não foi possível registrar a entrega."
  end

  private

  def set_campaign_and_raffle
    @campaign = current_organization.campaigns
                                    .where(type: "OrganizationCampaign")
                                    .find(params[:campaign_id])
    @raffle = @campaign.raffles.find(params[:raffle_id])
  end
end
