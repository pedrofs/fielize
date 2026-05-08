# frozen_string_literal: true

# Phone-verification token generation + verification for Customer.
#
# `verify_with(token)` returns a Result the caller branches on:
# `.valid?` (signature good and within TTL — Customer's `verified_at`
# was set), `.expired?` (signature good but past TTL — re-issue offered)
# or `.invalid?` (missing, malformed, tampered, or for a different
# Customer). The split lets the controller render distinct pages for
# expired vs forged tokens without leaking which one applied.
module Customer::Verifiable
  extend ActiveSupport::Concern

  def generate_verification_token
    Customer::VerificationToken.generate(self)
  end

  def verify_with(token)
    decoded = Customer::VerificationToken.decode(token)
    return decoded if decoded.invalid?
    return Customer::VerificationToken::Result.new(status: :invalid) unless decoded.customer_id == id
    return decoded if decoded.expired?

    update!(verified_at: Time.current) unless verified?
    decoded
  end
end
