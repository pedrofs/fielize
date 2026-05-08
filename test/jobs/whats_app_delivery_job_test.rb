# frozen_string_literal: true

require "test_helper"

class WhatsAppDeliveryJobTest < ActiveJob::TestCase
  class RecordingDispatcher
    attr_reader :calls

    def initialize
      @calls = []
    end

    def dispatch_verification(customer:)
      @calls << customer
    end
  end

  setup do
    @fake = RecordingDispatcher.new
    WhatsAppDispatcher.current = @fake
  end

  teardown do
    WhatsAppDispatcher.reset!
  end

  test "delegates to the configured dispatcher for an unverified customer" do
    customer = customers(:maria)

    WhatsAppDeliveryJob.perform_now(customer_id: customer.id)

    assert_equal [ customer.id ], @fake.calls.map(&:id)
  end

  test "skips dispatch for an already-verified customer" do
    WhatsAppDeliveryJob.perform_now(customer_id: customers(:joao).id)

    assert_empty @fake.calls
  end

  test "is a no-op when the customer no longer exists" do
    WhatsAppDeliveryJob.perform_now(customer_id: "00000000-0000-0000-0000-000000000000")

    assert_empty @fake.calls
  end
end
