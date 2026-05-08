# frozen_string_literal: true

class Merchant
  module Geocoding
    extend ActiveSupport::Concern

    included do
      geocoded_by :address
      after_validation :geocode, if: :address_changed?
    end
  end
end
