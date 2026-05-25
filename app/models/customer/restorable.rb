# frozen_string_literal: true

# Cross-device Wallet restore — "entrar com WhatsApp".
#
# `Customer.recover_wallet(phone:)` looks up a Customer by normalized
# phone and, if one exists, enqueues the WhatsApp device link
# **unconditionally** — even for an already-`verified?` Customer (hence
# `force: true` on the job), because a new device still needs the cookie
# that the `/v/:token` tap writes via `attach_to_device`. This differs
# from `enroll!` and the `/me` resend banner, which guard on `!verified?`:
# a verified Customer never needs to verify again, but may still need to
# re-attach a fresh device.
#
# The method returns `nil` whether or not the phone matched a Customer, so
# the caller cannot branch on a found/not-found signal. Combined with the
# controller rendering an identical acknowledgement either way, this makes
# Wallet membership impossible to enumerate by probing phone numbers.
module Customer::Restorable
  extend ActiveSupport::Concern

  class_methods do
    def recover_wallet(phone:)
      normalized = normalize_phone(phone)
      customer = find_by(phone: normalized) if normalized

      WhatsAppDeliveryJob.perform_later(customer_id: customer.id, force: true) if customer

      nil
    end
  end
end
