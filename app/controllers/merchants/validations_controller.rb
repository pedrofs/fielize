# frozen_string_literal: true

class Merchants::ValidationsController < Merchants::BaseController
  with_title "Validar código"
  with_breadcrumb label: "Validar código",
                  path: -> { new_merchants_validation_path }

  def new
    render inertia: { code: "" }
  end

  def create
    code = params.require(:code).to_s.strip
    confirmed = current_merchant.confirm_stamps(code: code)

    if confirmed.empty?
      return redirect_to new_merchants_validation_path,
                         inertia: { errors: { code: "Código inválido ou expirado." } }
    end

    visit    = confirmed.first.visit
    customer = confirmed.first.customer

    render inertia: "merchants/validations/new", props: {
      code: "",
      success: {
        customer: serialize_customer(customer),
        campaign_progress: current_merchant.campaign_progress_for(customer: customer, visit: visit),
        validated_campaign_ids: confirmed.map(&:campaign_id).uniq
      }
    }
  end

  private

  def serialize_customer(customer)
    {
      id: customer.id,
      name: customer.name.presence || customer.phone,
      phone: customer.phone
    }
  end
end
