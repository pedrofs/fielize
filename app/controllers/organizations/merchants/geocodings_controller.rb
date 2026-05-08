# frozen_string_literal: true

class Organizations::Merchants::GeocodingsController < Organizations::BaseController
  def create
    address = params[:address].to_s.strip

    if address.blank?
      render json: { error: "address is required" }, status: :unprocessable_entity
      return
    end

    result = Geocoder.search(address).first

    if result && result.latitude && result.longitude
      render json: { latitude: result.latitude, longitude: result.longitude }
    else
      render json: { error: "could not locate address" }, status: :unprocessable_entity
    end
  end
end
