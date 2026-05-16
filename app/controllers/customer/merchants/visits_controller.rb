# frozen_string_literal: true

# Thin POST handler behind the "Ganhar selo" button. Slice 9.1 requires
# `@current_customer` to be set by the signed cookie — the unidentified
# inline-form path (state 3 of the page-state matrix) lands in Slice 9.2,
# which will extend this action to accept a `phone` param and run
# identify-then-claim atomically.
class Customer::Merchants::VisitsController < Customer::BaseController
  skip_before_action :set_organization

  def create
    merchant = Merchant.find_by!(slug: params[:merchant_slug])

    if @current_customer
      Visit.create_from_scan!(customer: @current_customer, merchant: merchant)
    end

    redirect_to customer_merchant_path(merchant.slug)
  end
end
