require "test_helper"

class CustomerTest < ActiveSupport::TestCase
  setup do
    @valid_attrs = { phone: "+5511987654321", lgpd_opted_in_at: Time.current }
  end

  test "creates with valid attributes" do
    customer = Customer.new(@valid_attrs)
    assert customer.valid?, customer.errors.full_messages.inspect
  end

  test "phone is required" do
    customer = Customer.new(@valid_attrs.merge(phone: nil))
    refute customer.valid?
    assert_includes customer.errors[:phone], "can't be blank"
  end

  test "lgpd_opted_in_at is required" do
    customer = Customer.new(@valid_attrs.merge(lgpd_opted_in_at: nil))
    refute customer.valid?
    assert_includes customer.errors[:lgpd_opted_in_at], "can't be blank"
  end

  test "phone uniqueness collides with existing fixture" do
    duplicate = Customer.new(@valid_attrs.merge(phone: customers(:maria).phone))
    refute duplicate.valid?
    assert_includes duplicate.errors[:phone], "has already been taken"
  end

  test "normalizes Brazilian phone with formatting to E.164" do
    customer = Customer.new(@valid_attrs.merge(phone: "(53) 99999-1111"))
    assert customer.valid?, customer.errors.full_messages.inspect
    assert_equal "+5553999991111", customer.phone
  end

  test "normalizes Uruguayan phone with country code" do
    customer = Customer.new(@valid_attrs.merge(phone: "+598 99 123 456"))
    assert customer.valid?, customer.errors.full_messages.inspect
    assert_equal "+59899123456", customer.phone
  end

  test "rejects garbage phone strings" do
    customer = Customer.new(@valid_attrs.merge(phone: "not a phone"))
    refute customer.valid?
    assert customer.errors[:phone].any?, customer.errors.full_messages.inspect
  end

  test "rejects phone that doesn't match any country format" do
    customer = Customer.new(@valid_attrs.merge(phone: "+1 555 123"))
    refute customer.valid?
    assert customer.errors[:phone].any?, customer.errors.full_messages.inspect
  end

  test "duplicate phone in different formats collides on uniqueness" do
    formatted = "(53) 98888-7777"
    assert_equal customers(:maria).phone, Customer.normalize_phone(formatted)
    duplicate = Customer.new(@valid_attrs.merge(phone: formatted))
    refute duplicate.valid?
    assert_includes duplicate.errors[:phone], "has already been taken"
  end

  test "verified? reflects verified_at" do
    customer = Customer.new(@valid_attrs)
    refute customer.verified?
    customer.verified_at = Time.current
    assert customer.verified?
  end

  test "Customer.normalize_phone is a class-level helper" do
    assert_equal "+5553999991111", Customer.normalize_phone("(53) 99999-1111")
    assert_nil Customer.normalize_phone(nil)
    assert_nil Customer.normalize_phone("")
    assert_nil Customer.normalize_phone("not a phone")
  end
end
