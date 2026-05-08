# frozen_string_literal: true

require "test_helper"

class Customer::VerifiableTest < ActiveSupport::TestCase
  setup do
    @customer = customers(:maria)
  end

  test "generate→verify roundtrip sets verified_at" do
    refute @customer.verified?
    token = @customer.generate_verification_token

    result = @customer.verify_with(token)

    assert result.valid?
    assert @customer.reload.verified?
  end

  test "verify_with reports a tampered token as :invalid" do
    token = @customer.generate_verification_token
    tampered = token.sub(/.$/, "x")

    result = @customer.verify_with(tampered)

    assert result.invalid?
    refute @customer.reload.verified?
  end

  test "verify_with reports an expired token as :expired and does not verify" do
    token = @customer.generate_verification_token

    travel (Customer::VerificationToken::TTL + 1.minute) do
      result = @customer.verify_with(token)

      assert result.expired?
      refute @customer.reload.verified?
    end
  end

  test "verify_with refuses a token issued for a different customer" do
    foreign_token = customers(:joao).generate_verification_token

    result = @customer.verify_with(foreign_token)

    assert result.invalid?
    refute @customer.reload.verified?
  end

  test "verify_with is a no-op on an already-verified customer (does not bump verified_at)" do
    already_verified = customers(:joao)
    original = already_verified.verified_at
    token = already_verified.generate_verification_token

    result = already_verified.verify_with(token)

    assert result.valid?
    assert_equal original.to_i, already_verified.reload.verified_at.to_i
  end

  test "verify_with reports a blank token as :invalid" do
    assert @customer.verify_with(nil).invalid?
    assert @customer.verify_with("").invalid?
  end
end
