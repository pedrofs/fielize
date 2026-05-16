# frozen_string_literal: true

# Customer identification via phone + signed cookie.
#
# `Customer.identify_for(phone:, cookie_jar:)` is the canonical entry
# point used by enroll, verify, and any future flow that needs to
# attach an Inertia request to a Customer record. New-phone path creates
# a row with `lgpd_opted_in_at`; existing-phone path attaches without
# duplicating. Either way the signed `customer_session` cookie is set
# (or refreshed) so subsequent requests recognize the device — across
# Organizations, by design.
module Customer::Identifiable
  extend ActiveSupport::Concern

  COOKIE_KEY = :customer_session

  class_methods do
    def identify_for(phone:, name:, cookie_jar:)
      normalized = normalize_phone(phone)
      return nil unless normalized

      # The name is only ever written on the create branch — once a Customer
      # exists, their name is preserved across re-identifications even when a
      # different name is supplied, so identity stays stable across Organizations.
      customer = find_or_create_by!(phone: normalized) do |c|
        c.name = name
        c.lgpd_opted_in_at = Time.current
      end

      write_cookie(customer, cookie_jar)
      customer
    end

    def from_cookie(cookie_jar:)
      payload = cookie_jar.signed[COOKIE_KEY]
      customer_id = payload.is_a?(Hash) ? (payload["customer_id"] || payload[:customer_id]) : nil
      return nil if customer_id.blank?

      customer = find_by(id: customer_id)
      return nil unless customer

      write_cookie(customer, cookie_jar)
      customer
    end

    def forget_cookie(cookie_jar:)
      cookie_jar.delete(COOKIE_KEY)
    end

    # Attaches an already-resolved Customer to the device. Used by the
    # verification link tap, where the Customer is identified by a
    # signed token rather than a phone form, but should still be
    # recognized by the cookie on subsequent visits.
    def attach_to_device(customer:, cookie_jar:)
      write_cookie(customer, cookie_jar)
    end

    private

    def write_cookie(customer, cookie_jar)
      cookie_jar.signed.permanent[COOKIE_KEY] = {
        value: { customer_id: customer.id },
        httponly: true,
        same_site: :lax
      }
    end
  end
end
