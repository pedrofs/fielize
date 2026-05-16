# frozen_string_literal: true

# Orchestrates "Customer scans merchant QR" end-to-end:
#
# - find-or-create today's Visit (BRT day-boundary; DB partial unique
#   index is the race anchor),
# - on first scan of the day, enroll the Customer in every active
#   matching Campaign covering this Merchant (idempotent via
#   `Campaign#enroll!`),
# - generate a single 6-digit code,
# - create one pending Stamp per matching Campaign, all sharing that
#   code,
# - return the Visit (existing on re-scan, otherwise the freshly
#   created one).
#
# Codes are set with a far-future `expires_at` so legacy validators and
# the `.valid` scope keep working — the time-window semantics from the
# old TTL design no longer apply (see Stamp::CodeGenerator).
class Visit
  module Scannable
    extend ActiveSupport::Concern

    STAMP_EXPIRES_AT_SENTINEL = 100.years

    class_methods do
      def create_from_scan!(customer:, merchant:)
        today = Time.zone.today

        transaction do
          existing = where(customer: customer, merchant: merchant, local_day: today).first
          return existing if existing

          visit = create!(customer: customer, merchant: merchant, local_day: today)
          campaigns = merchant.active_campaigns_now

          campaigns.each { |campaign| campaign.enroll!(customer: customer) }

          if campaigns.any?
            code = Stamp::CodeGenerator.call(merchant_id: merchant.id)
            expires_at = STAMP_EXPIRES_AT_SENTINEL.from_now
            campaigns.each do |campaign|
              Stamp.create!(
                visit: visit,
                campaign: campaign,
                customer: customer,
                merchant: merchant,
                status: "pending",
                code: code,
                expires_at: expires_at
              )
            end
          end

          visit
        end
      rescue ActiveRecord::RecordNotUnique
        # Lost the concurrent insert race; the winning Visit is now visible.
        where(customer: customer, merchant: merchant, local_day: today).first!
      end
    end
  end
end
