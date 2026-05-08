# frozen_string_literal: true

require "application_system_test_case"

class Customer::OrganizationLandingTest < ApplicationSystemTestCase
  test "renders org name and merchant list with addresses" do
    organization = organizations(:one)
    merchant = merchants(:one)

    visit "/o/#{organization.slug}"

    assert_text organization.name
    assert_text merchant.name
    assert_text merchant.address
  end

  test "renders the still-being-set-up placeholder when org has no merchants and no campaigns" do
    organization = organizations(:empty)

    visit "/o/#{organization.slug}"

    assert_text organization.name
    assert_text "ainda está sendo configurada"
  end

  test "renders a map with one marker per merchant and opens a bottom sheet on tap" do
    organization = organizations(:one)
    merchant = merchants(:one)

    visit "/o/#{organization.slug}"

    assert_selector "[data-testid='merchants-map']"
    marker = find(".leaflet-marker-icon", match: :first)
    marker.click

    within("[data-testid='merchant-sheet']") do
      assert_text merchant.name
      assert_text merchant.address
      assert_text "Campanhas ativas neste lojista"
    end
  end

  test "renders the map placeholder when the org has merchants without coordinates" do
    organization = organizations(:one)
    organization.merchants.update_all(latitude: nil, longitude: nil)

    visit "/o/#{organization.slug}"

    assert_selector "[data-testid='map-placeholder']"
    assert_text "Localizações em breve"
  end
end
