# frozen_string_literal: true

class Customer::Organizations::Campaigns::EnrollmentsController < Customer::BaseController
  before_action :ensure_customer

  def create
    campaign = @organization.campaigns.active_now.find_by!(slug: params[:slug])

    campaign.enroll!(customer: @customer)

    redirect_to(
      customer_organization_campaign_path(@organization.slug, campaign.slug),
      notice: "Inscrição confirmada! Você receberá um WhatsApp para confirmar seu número."
    )
  end

  private

  def ensure_customer
    @customer = @current_customer || Customer.identify_for(
      phone: enrollment_params[:phone],
      cookie_jar: cookies
    )

    return if @customer

    redirect_to(
      customer_organization_campaign_path(@organization.slug, params[:slug]),
      inertia: { errors: { phone: "Número de WhatsApp inválido" } }
    )
  end

  def enrollment_params
    params.fetch(:enrollment, {}).permit(:phone)
  end
end
