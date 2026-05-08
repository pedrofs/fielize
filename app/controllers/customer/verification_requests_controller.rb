# frozen_string_literal: true

# "Request a new verification link" — the sub-resource exposed on the
# expired-link page. The original token's signature still verifies past
# its TTL, so we re-decode it (accepting :expired as well as :valid) to
# recover the Customer it was issued for, and re-enqueue the WhatsApp
# job. The post-action UX is a friendly acknowledgement page; we never
# leak whether the inbound token was expired vs forged.
class Customer::VerificationRequestsController < Customer::BaseController
  skip_before_action :set_organization

  def create
    decoded = Customer::VerificationToken.decode(verification_request_params[:token])

    if decoded.valid? || decoded.expired?
      customer = Customer.find_by(id: decoded.customer_id)
      WhatsAppDeliveryJob.perform_later(customer_id: customer.id) if customer && !customer.verified?
    end

    set_title "Novo link enviado"
    render inertia: "customer/verifications/requested"
  end

  private

  def verification_request_params
    params.fetch(:verification_request, {}).permit(:token)
  end
end
