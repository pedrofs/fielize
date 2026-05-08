# frozen_string_literal: true

require "test_helper"

class Organizations::MerchantsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as(users(:admin))
  end

  test "create persists merchant with provided coordinates and skips auto-geocoding" do
    Geocoder::Lookup::Test.add_stub(
      "Praça da Sé, São Paulo",
      [ { "latitude" => -23.55, "longitude" => -46.63 } ]
    )
    previous_lookup = Geocoder.config.lookup
    Geocoder.configure(lookup: :test)

    assert_difference -> { Merchant.count }, 1 do
      post organizations_merchants_path, params: {
        merchant: {
          name: "Loja Nova",
          address: "Praça da Sé, São Paulo",
          latitude: -23.5,
          longitude: -46.6
        }
      }
    end

    merchant = Merchant.order(:created_at).last
    assert_equal "Loja Nova", merchant.name
    assert_in_delta(-23.5, merchant.latitude.to_f, 0.0001)
    assert_in_delta(-46.6, merchant.longitude.to_f, 0.0001)
  ensure
    Geocoder::Lookup::Test.reset
    Geocoder.configure(lookup: previous_lookup) if previous_lookup
  end

  test "create rejects merchant without coordinates" do
    assert_no_difference -> { Merchant.count } do
      post organizations_merchants_path, params: {
        merchant: { name: "Loja Sem Pino", address: "" }
      }
    end
    assert_response :redirect
    follow_redirect!
    assert_response :success
  end
end
