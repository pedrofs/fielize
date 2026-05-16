# frozen_string_literal: true

require "test_helper"

class Customer::IdentifiableTest < ActiveSupport::TestCase
  # Minimal stand-in for ActionDispatch::Cookies::CookieJar that supports
  # the `signed.permanent[...]=` and `signed[...]` access pattern. The
  # real jar adds AES-GCM signing on top — we don't need to exercise that
  # in isolation here since this tests behavior, not crypto.
  class FakeCookieJar
    def initialize
      @store = {}
      @signed = SignedJar.new(@store)
    end

    def signed
      @signed
    end

    def delete(key)
      @store.delete(key)
    end

    def [](key)
      @store[key]
    end

    class SignedJar
      def initialize(store)
        @store = store
      end

      def [](key)
        @store[key]
      end

      def []=(key, value)
        @store[key] = value.is_a?(Hash) && value.key?(:value) ? value[:value].deep_stringify_keys : value
      end

      def permanent
        self
      end
    end
  end

  setup do
    @jar = FakeCookieJar.new
  end

  test "creates a Customer for a new phone, normalizes to E.164, and sets lgpd_opted_in_at" do
    customer = Customer.identify_for(phone: "(53) 90000-0001", name: "Ana", cookie_jar: @jar)

    assert customer.persisted?
    assert_equal "+5553900000001", customer.phone
    assert_equal "Ana", customer.name
    assert_not_nil customer.lgpd_opted_in_at
  end

  test "returns nil when phone cannot be normalized" do
    assert_nil Customer.identify_for(phone: "garbage", name: "Ana", cookie_jar: @jar)
  end

  test "raises a validation error when creating a new Customer without a name" do
    assert_raises(ActiveRecord::RecordInvalid) do
      Customer.identify_for(phone: "(53) 90000-9999", name: nil, cookie_jar: @jar)
    end
  end

  test "preserves the existing Customer's name when a different name is passed in" do
    existing = customers(:maria)
    original_name = existing.name

    result = Customer.identify_for(phone: existing.phone, name: "Outro Nome", cookie_jar: @jar)
    assert_equal existing.id, result.id
    assert_equal original_name, result.reload.name
  end

  test "attaches to an existing Customer for a known phone without duplicating" do
    existing = customers(:maria)

    assert_no_difference -> { Customer.count } do
      result = Customer.identify_for(phone: existing.phone, name: existing.name, cookie_jar: @jar)
      assert_equal existing.id, result.id
    end
  end

  test "writes a signed cookie with the customer_id payload on identify" do
    customer = Customer.identify_for(phone: "+5553900000002", name: "Beto", cookie_jar: @jar)

    payload = @jar.signed[Customer::Identifiable::COOKIE_KEY]
    assert payload.is_a?(Hash)
    assert_equal customer.id, payload["customer_id"]
  end

  test "from_cookie returns the Customer when the signed payload is valid" do
    existing = customers(:maria)
    @jar.signed[Customer::Identifiable::COOKIE_KEY] = { value: { customer_id: existing.id } }

    found = Customer.from_cookie(cookie_jar: @jar)
    assert_equal existing.id, found.id
  end

  test "from_cookie returns nil when the cookie is empty or unrecognized" do
    assert_nil Customer.from_cookie(cookie_jar: @jar)

    @jar.signed[Customer::Identifiable::COOKIE_KEY] = { value: { customer_id: "00000000-0000-0000-0000-000000000000" } }
    assert_nil Customer.from_cookie(cookie_jar: @jar)
  end

  test "forget_cookie clears the signed cookie" do
    @jar.signed[Customer::Identifiable::COOKIE_KEY] = { value: { customer_id: customers(:maria).id } }

    Customer.forget_cookie(cookie_jar: @jar)
    assert_nil @jar.signed[Customer::Identifiable::COOKIE_KEY]
  end
end
