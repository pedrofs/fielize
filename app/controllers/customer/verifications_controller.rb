# frozen_string_literal: true

# Handles the WhatsApp verification link tap. Three branches:
#
# - **valid**: signature checks out and the token is fresh — sets
#   `customers.verified_at`, attaches the Customer to this device's
#   cookie (so a tap from a fresh browser still recognizes them on
#   subsequent visits), and renders the confirmation page.
# - **expired**: signature checks out but the token has aged past TTL.
#   Renders the "request a new link" page; the embedded form posts to
#   `Customer::VerificationRequestsController#create` with the same
#   token so a fresh link can be re-issued for the same Customer.
# - **invalid**: anything else — missing, malformed, tampered, or for
#   a Customer the token's signature does not vouch for. Renders a
#   generic "this link isn't valid" page that intentionally does not
#   distinguish "expired" from "tampered" to avoid leaking which one
#   applied.
class Customer::VerificationsController < Customer::BaseController
  skip_before_action :set_organization

  def show
    decoded = Customer::VerificationToken.decode(params[:token])

    if decoded.valid?
      verify!(decoded.customer_id)
      set_title "Confirmação de WhatsApp"
      render inertia: "customer/verifications/show"
    elsif decoded.expired?
      set_title "Link expirado"
      render inertia: "customer/verifications/expired", props: { token: params[:token] }
    else
      set_title "Link inválido"
      render inertia: "customer/verifications/invalid"
    end
  end

  private

  def verify!(customer_id)
    customer = Customer.find_by(id: customer_id)
    return unless customer

    customer.update!(verified_at: Time.current) unless customer.verified?
    Customer.attach_to_device(customer: customer, cookie_jar: cookies)
  end
end
