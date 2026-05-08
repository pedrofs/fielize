# frozen_string_literal: true

class WhatsAppDeliveryJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: :polynomially_longer, attempts: 5
  discard_on ActiveJob::DeserializationError

  def perform(customer_id:)
    customer = Customer.find_by(id: customer_id)
    return unless customer
    return if customer.verified?

    WhatsAppDispatcher.dispatch_verification(customer: customer)
  end
end
