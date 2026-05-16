# frozen_string_literal: true

# POST handler behind the "Ganhar selo" button. Accepts the cookie-identified
# Customer (preferred), or falls back to an inline WhatsApp phone — both paths
# land on `Visit.create_from_scan!`. An invalid phone (or no phone and no
# cookie) redirects back to the landing page with an Inertia error.
class Customer::Merchants::VisitsController < Customer::BaseController
  skip_before_action :set_organization

  def create
    merchant = Merchant.find_by!(slug: params[:merchant_slug])

    customer = @current_customer || Customer.identify_for(
      phone: visit_params[:phone],
      cookie_jar: cookies
    )

    unless customer
      return redirect_to(
        customer_merchant_path(merchant.slug),
        inertia: { errors: { phone: "Número de WhatsApp inválido" } }
      )
    end

    Visit.create_from_scan!(customer: customer, merchant: merchant)
    redirect_to customer_merchant_path(merchant.slug)
  end

  private

  def visit_params
    params.fetch(:visit, {}).permit(:phone)
  end
end
