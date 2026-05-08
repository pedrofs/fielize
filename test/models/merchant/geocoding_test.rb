# frozen_string_literal: true

require "test_helper"

class Merchant::GeocodingTest < ActiveSupport::TestCase
  STUB_COORDS = [ -31.5343, -53.0925 ].freeze

  setup do
    Geocoder::Lookup::Test.add_stub(
      "Rua das Flores, 100, Jaguarão",
      [ { "latitude" => STUB_COORDS[0], "longitude" => STUB_COORDS[1] } ]
    )
    Geocoder::Lookup::Test.add_stub(
      "Praça XV, 1, Pelotas",
      [ { "latitude" => -31.7654, "longitude" => -52.3376 } ]
    )
    Geocoder::Lookup::Test.add_stub("", [])

    @previous_lookup = Geocoder.config.lookup
    Geocoder.configure(lookup: :test)
  end

  teardown do
    Geocoder::Lookup::Test.reset
    Geocoder.configure(lookup: @previous_lookup)
  end

  test "geocodes when address changes" do
    merchant = merchants(:one)
    merchant.update!(address: "Rua das Flores, 100, Jaguarão")

    assert_in_delta STUB_COORDS[0], merchant.latitude.to_f, 0.0001
    assert_in_delta STUB_COORDS[1], merchant.longitude.to_f, 0.0001
  end

  test "preserves manual coordinates when address is unchanged" do
    merchant = merchants(:one)
    merchant.update!(address: "Rua das Flores, 100, Jaguarão")

    merchant.update!(latitude: -31.5, longitude: -53.0)
    merchant.update!(name: "#{merchant.name} (renamed)")

    assert_in_delta(-31.5, merchant.latitude.to_f, 0.0001)
    assert_in_delta(-53.0, merchant.longitude.to_f, 0.0001)
  end

  test "re-geocodes when address changes again" do
    merchant = merchants(:one)
    merchant.update!(address: "Rua das Flores, 100, Jaguarão")
    merchant.update!(address: "Praça XV, 1, Pelotas")

    assert_in_delta(-31.7654, merchant.latitude.to_f, 0.0001)
    assert_in_delta(-52.3376, merchant.longitude.to_f, 0.0001)
  end

  test "manual coordinates win when address and lat/lng both change in same save" do
    merchant = merchants(:one)
    merchant.update!(
      address: "Rua das Flores, 100, Jaguarão",
      latitude: -31.234,
      longitude: -53.456
    )

    assert_in_delta(-31.234, merchant.latitude.to_f, 0.0001)
    assert_in_delta(-53.456, merchant.longitude.to_f, 0.0001)
  end
end
