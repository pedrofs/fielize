# frozen_string_literal: true

require "application_system_test_case"

class Organizations::MerchantFormTest < ApplicationSystemTestCase
  setup do
    Geocoder::Lookup::Test.add_stub(
      "Rua das Flores, 100, Jaguarão",
      [ { "latitude" => -32.555, "longitude" => -53.378 } ]
    )
    @previous_lookup = Geocoder.config.lookup
    Geocoder.configure(lookup: :test)
  end

  teardown do
    Geocoder::Lookup::Test.reset
    Geocoder.configure(lookup: @previous_lookup)
  end

  test "admin geocodes address, adjusts coordinates, saves merchant; customer page renders pin at corrected position" do
    sign_in_as(users(:admin))

    visit new_organizations_merchant_path
    fill_in "merchant_name", with: "Sapataria Central"
    fill_in "merchant_address", with: "Rua das Flores, 100, Jaguarão"

    click_on "Localizar"

    assert_field "merchant_latitude", with: "-32.555", wait: 5
    assert_field "merchant_longitude", with: "-53.378"

    fill_in "merchant_latitude", with: "-32.5611"
    fill_in "merchant_longitude", with: "-53.3742"

    click_on "Criar lojista"

    assert_text "Sapataria Central"

    merchant = Merchant.find_by!(name: "Sapataria Central")
    assert_in_delta(-32.5611, merchant.latitude.to_f, 0.0001)
    assert_in_delta(-53.3742, merchant.longitude.to_f, 0.0001)

    visit "/o/#{organizations(:one).slug}"
    assert_selector "[data-testid='merchants-map']"
    assert_text "Sapataria Central"
  end
end
