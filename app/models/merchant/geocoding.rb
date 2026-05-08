# frozen_string_literal: true

class Merchant
  module Geocoding
    extend ActiveSupport::Concern

    included do
      geocoded_by :address
      after_validation :geocode, if: :should_auto_geocode?
    end

    private

    def should_auto_geocode?
      address_changed? && !latitude_changed? && !longitude_changed?
    end
  end
end
