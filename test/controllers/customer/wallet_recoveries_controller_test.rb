# frozen_string_literal: true

require "test_helper"

class Customer::WalletRecoveriesControllerTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  test "create enqueues the device link for a known phone and redirects with an acknowledgement" do
    customer = customers(:maria)

    assert_enqueued_with(
      job: WhatsAppDeliveryJob,
      args: [ { customer_id: customer.id, force: true } ]
    ) do
      post customer_wallet_recoveries_path,
        params: { wallet_recovery: { phone: "+55 (53) 98888-7777" } }
    end

    assert_redirected_to customer_wallet_path
    assert flash[:notice].present?
  end

  test "create enqueues nothing for an unknown phone but redirects identically" do
    assert_no_enqueued_jobs only: WhatsAppDeliveryJob do
      post customer_wallet_recoveries_path,
        params: { wallet_recovery: { phone: "+5511900000000" } }
    end

    assert_redirected_to customer_wallet_path
    assert flash[:notice].present?
  end

  test "create handles a blank phone without erroring (identical response)" do
    assert_no_enqueued_jobs only: WhatsAppDeliveryJob do
      post customer_wallet_recoveries_path, params: { wallet_recovery: { phone: "" } }
    end

    assert_redirected_to customer_wallet_path
    assert flash[:notice].present?
  end
end
