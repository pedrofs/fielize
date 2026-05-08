# frozen_string_literal: true

require "test_helper"

class Organizations::Merchants::GeocodingsControllerTest < ActionDispatch::IntegrationTest
  setup do
    Geocoder::Lookup::Test.add_stub(
      "Praça XV, 1, Pelotas",
      [ { "latitude" => -31.7654, "longitude" => -52.3376 } ]
    )
    Geocoder::Lookup::Test.add_stub("Endereço inexistente", [])

    @previous_lookup = Geocoder.config.lookup
    Geocoder.configure(lookup: :test)

    sign_in_as(users(:admin))
  end

  teardown do
    Geocoder::Lookup::Test.reset
    Geocoder.configure(lookup: @previous_lookup)
  end

  test "create returns coordinates for a known address" do
    post organizations_merchants_geocodings_path, params: { address: "Praça XV, 1, Pelotas" }, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_in_delta(-31.7654, body["latitude"].to_f, 0.0001)
    assert_in_delta(-52.3376, body["longitude"].to_f, 0.0001)
  end

  test "create rejects blank address" do
    post organizations_merchants_geocodings_path, params: { address: "" }, as: :json
    assert_response :unprocessable_entity
  end

  test "create returns 422 when address cannot be located" do
    post organizations_merchants_geocodings_path, params: { address: "Endereço inexistente" }, as: :json
    assert_response :unprocessable_entity
  end

  test "create requires authentication" do
    delete session_url
    post organizations_merchants_geocodings_path, params: { address: "Praça XV, 1, Pelotas" }, as: :json
    assert_response :redirect
  end
end
