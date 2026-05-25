# frozen_string_literal: true

require "test_helper"

class Customer::RestorableTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  test "enqueues the device link for a known unverified customer" do
    customer = customers(:maria)
    refute customer.verified?

    assert_enqueued_with(
      job: WhatsAppDeliveryJob,
      args: [ { customer_id: customer.id, force: true } ]
    ) do
      Customer.recover_wallet(phone: customer.phone)
    end
  end

  test "enqueues the device link for a known verified customer" do
    customer = customers(:joao)
    assert customer.verified?

    assert_enqueued_with(
      job: WhatsAppDeliveryJob,
      args: [ { customer_id: customer.id, force: true } ]
    ) do
      Customer.recover_wallet(phone: customer.phone)
    end
  end

  test "accepts loosely-formatted phone input and normalizes it" do
    customer = customers(:maria) # +5553988887777

    assert_enqueued_with(
      job: WhatsAppDeliveryJob,
      args: [ { customer_id: customer.id, force: true } ]
    ) do
      Customer.recover_wallet(phone: "+55 (53) 98888-7777")
    end
  end

  test "enqueues nothing for an unknown phone" do
    assert_no_enqueued_jobs only: WhatsAppDeliveryJob do
      Customer.recover_wallet(phone: "+5511900000000")
    end
  end

  test "enqueues nothing for a blank or unparseable phone" do
    assert_no_enqueued_jobs only: WhatsAppDeliveryJob do
      Customer.recover_wallet(phone: "")
      Customer.recover_wallet(phone: "not-a-phone")
    end
  end

  test "returns nil regardless of whether the phone matched" do
    # Identical (non-leaking) return value — enumeration resistance lives in
    # the response, not in a found/not-found signal the caller can branch on.
    assert_nil Customer.recover_wallet(phone: customers(:maria).phone)
    assert_nil Customer.recover_wallet(phone: "+5511900000000")
  end
end
