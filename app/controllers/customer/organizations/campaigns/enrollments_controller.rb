# frozen_string_literal: true

class Customer::Organizations::Campaigns::EnrollmentsController < Customer::BaseController
  def create
    campaign = @organization.campaigns.active_now.find_by!(slug: params[:slug])

    customer = @current_customer || Customer.identify_for(
      phone: enrollment_params[:phone],
      cookie_jar: cookies
    )

    unless customer
      redirect_to(
        customer_organization_campaign_path(@organization.slug, campaign.slug),
        inertia: { errors: { phone: "Número de WhatsApp inválido" } }
      )
      return
    end

    campaign.enroll!(customer: customer)

    redirect_to(
      customer_organization_campaign_path(@organization.slug, campaign.slug),
      notice: "Inscrição confirmada! Você receberá um WhatsApp para confirmar seu número."
    )
  end

  private

  def enrollment_params
    params.fetch(:enrollment, {}).permit(:phone)
  end
end
