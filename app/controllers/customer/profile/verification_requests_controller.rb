# frozen_string_literal: true

# Resend the WhatsApp confirmation link for the cookie-identified
# Customer. Distinct from `Customer::VerificationRequestsController`
# (which is keyed by an inbound token from an expired link); this one
# is keyed by `current_customer` and is invoked from the `/me` banner.
class Customer::Profile::VerificationRequestsController < Customer::BaseController
  skip_before_action :set_organization

  def create
    if @current_customer && !@current_customer.verified?
      WhatsAppDeliveryJob.perform_later(customer_id: @current_customer.id)
    end

    redirect_to customer_profile_path, notice: "Enviamos um novo link para o seu WhatsApp."
  end
end
