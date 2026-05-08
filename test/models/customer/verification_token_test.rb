# frozen_string_literal: true

require "test_helper"

class Customer::VerificationTokenTest < ActiveSupport::TestCase
  setup do
    @customer = customers(:maria)
  end

  test "decode returns :valid with customer_id for a fresh token" do
    token = Customer::VerificationToken.generate(@customer)

    result = Customer::VerificationToken.decode(token)

    assert result.valid?
    assert_equal @customer.id, result.customer_id
  end

  test "decode returns :expired with customer_id once past TTL" do
    token = Customer::VerificationToken.generate(@customer)

    travel (Customer::VerificationToken::TTL + 1.minute) do
      result = Customer::VerificationToken.decode(token)

      assert result.expired?
      assert_equal @customer.id, result.customer_id
    end
  end

  test "decode returns :invalid for a tampered token (no customer_id leaked)" do
    token = Customer::VerificationToken.generate(@customer)
    tampered = token.sub(/.$/, "x")

    result = Customer::VerificationToken.decode(tampered)

    assert result.invalid?
    assert_nil result.customer_id
  end

  test "decode returns :invalid for blank input" do
    assert Customer::VerificationToken.decode(nil).invalid?
    assert Customer::VerificationToken.decode("").invalid?
  end

  test "decode returns :invalid for a token signed with the wrong purpose" do
    foreign = Rails.application.message_verifier("something_else")
                   .generate({ "customer_id" => @customer.id, "issued_at" => Time.current.to_i })

    result = Customer::VerificationToken.decode(foreign)

    assert result.invalid?
  end
end
