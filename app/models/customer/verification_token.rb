# frozen_string_literal: true

# Internal helper for Customer::Verifiable. Wraps Rails' MessageVerifier
# with a fixed purpose and TTL so a leaked link cannot be reused later
# or repurposed to verify a different identity.
class Customer::VerificationToken
  PURPOSE = "customer_verification"
  TTL = 7.days

  def self.generate(customer)
    verifier.generate(customer.id, purpose: PURPOSE, expires_in: TTL)
  end

  # Returns the customer_id encoded in the token, or nil if the token
  # is missing, tampered, expired, or scoped to a different purpose.
  def self.verify(token)
    return nil if token.blank?
    verifier.verified(token, purpose: PURPOSE)
  end

  def self.verifier
    Rails.application.message_verifier(PURPOSE)
  end
end
