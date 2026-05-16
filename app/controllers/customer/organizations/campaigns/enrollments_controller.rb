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
    if @current_customer
      @customer = @current_customer
      return
    end

    if enrollment_params[:name].blank?
      return redirect_to(
        customer_organization_campaign_path(@organization.slug, params[:slug]),
        inertia: { errors: { name: "Informe seu nome" } }
      )
    end

    @customer = Customer.identify_for(
      phone: enrollment_params[:phone],
      name:  enrollment_params[:name],
      cookie_jar: cookies
    )

    return if @customer

    redirect_to(
      customer_organization_campaign_path(@organization.slug, params[:slug]),
      inertia: { errors: { phone: "Número de WhatsApp inválido" } }
    )
  end

  def enrollment_params
    params.fetch(:enrollment, {}).permit(:phone, :name)
  end
end
