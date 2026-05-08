# frozen_string_literal: true

require "test_helper"

class Customer::VerifiableTest < ActiveSupport::TestCase
  setup do
    @customer = customers(:maria)
  end

  test "generate→verify roundtrip sets verified_at" do
    refute @customer.verified?
    token = @customer.generate_verification_token

    assert @customer.verify_with(token)
    assert @customer.reload.verified?
  end

  test "verify_with rejects a tampered token" do
    token = @customer.generate_verification_token
    tampered = token.sub(/.$/, "x")

    refute @customer.verify_with(tampered)
    refute @customer.reload.verified?
  end

  test "verify_with rejects an expired token" do
    token = @customer.generate_verification_token

    travel (Customer::VerificationToken::TTL + 1.minute) do
      refute @customer.verify_with(token)
      refute @customer.reload.verified?
    end
  end

  test "verify_with refuses a token issued for a different customer" do
    foreign_token = customers(:joao).generate_verification_token

    refute @customer.verify_with(foreign_token)
    refute @customer.reload.verified?
  end

  test "verify_with is a no-op on an already-verified customer (does not bump verified_at)" do
    already_verified = customers(:joao)
    original = already_verified.verified_at
    token = already_verified.generate_verification_token

    assert already_verified.verify_with(token)
    assert_equal original.to_i, already_verified.reload.verified_at.to_i
  end
end
