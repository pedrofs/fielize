# frozen_string_literal: true

class WhatsAppDeliveryJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: :polynomially_longer, attempts: 5
  discard_on ActiveJob::DeserializationError

  # `force: true` bypasses the `verified?` short-circuit. The default path
  # (verification, enrollment, resend banner) never needs to message an
  # already-verified Customer, but Wallet restore does: a verified Customer
  # on a new device still needs the device link to re-attach the cookie.
  def perform(customer_id:, force: false)
    customer = Customer.find_by(id: customer_id)
    return unless customer
    return if customer.verified? && !force

    WhatsAppDispatcher.dispatch_verification(customer: customer)
  end
end
