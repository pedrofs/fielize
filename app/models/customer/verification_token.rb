# frozen_string_literal: true

# Internal helper for Customer::Verifiable. Wraps Rails' MessageVerifier
# with a fixed purpose so a leaked link cannot be repurposed to verify
# a different identity, and embeds a separate `issued_at` timestamp so
# expiry can be detected after signature validation. That distinction
# lets the controller render an "expired" page (with a re-request CTA)
# separately from a "tampered/forged" page, without leaking which one
# applied.
class Customer::VerificationToken
  PURPOSE = "customer_verification"
  TTL = 7.days

  Result = Struct.new(:status, :customer_id, keyword_init: true) do
    def valid?    = status == :valid
    def expired?  = status == :expired
    def invalid?  = status == :invalid
  end

  def self.generate(customer)
    payload = { "customer_id" => customer.id, "issued_at" => Time.current.to_i }
    verifier.generate(payload, purpose: PURPOSE)
  end

  # Returns a Result indicating whether the token's signature passes,
  # and if so whether it has aged past TTL. `customer_id` is set on
  # both :valid and :expired so a fresh link can be re-issued for the
  # same Customer when the existing one has aged out.
  def self.decode(token)
    return Result.new(status: :invalid) if token.blank?

    payload = verifier.verified(token, purpose: PURPOSE)
    return Result.new(status: :invalid) unless payload.is_a?(Hash)

    customer_id = payload["customer_id"]
    issued_at_int = payload["issued_at"]
    return Result.new(status: :invalid) if customer_id.blank? || issued_at_int.blank?

    issued_at = Time.zone.at(issued_at_int)
    if issued_at + TTL < Time.current
      Result.new(status: :expired, customer_id: customer_id)
    else
      Result.new(status: :valid, customer_id: customer_id)
    end
  end

  def self.verifier
    Rails.application.message_verifier(PURPOSE)
  end
end
