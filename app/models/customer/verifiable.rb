# frozen_string_literal: true

# Phone-verification token generation + verification for Customer.
#
# The full `verify_with` flow lands in Slice 6 (the WhatsApp link
# handler); this slice exercises only `generate_verification_token`,
# which the `WhatsAppDeliveryJob` calls to embed a signed token in
# the message body. The PORO collaborator (`Customer::VerificationToken`)
# is internal — call sites use the model.
module Customer::Verifiable
  extend ActiveSupport::Concern

  def generate_verification_token
    Customer::VerificationToken.generate(self)
  end

  def verify_with(token)
    customer_id = Customer::VerificationToken.verify(token)
    return false unless customer_id == id

    update!(verified_at: Time.current) unless verified?
    true
  end
end
