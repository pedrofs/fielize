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

  test "merchant cards navigate to the merchant landing page" do
    organization = organizations(:one)
    merchant = merchants(:one)

    visit "/o/#{organization.slug}"

    find("[data-testid='merchant-card']", text: merchant.name).click

    assert_current_path "/m/#{merchant.slug}"
  end

  test "merchant cards show a monogram, name, address and a campaign-count chip" do
    organization = organizations(:one)
    merchant = merchants(:one)

    visit "/o/#{organization.slug}"

    within find("[data-testid='merchant-card']", text: merchant.name) do
      assert_selector "[data-testid='merchant-monogram']"
      assert_text merchant.name
      assert_text merchant.address
      assert_selector "[data-testid='merchant-campaign-count']", text: "2 campanhas aqui"
    end
  end

  test "merchant card renders a graceful zero-state chip when the merchant has no active campaigns" do
    organization = organizations(:one)
    merchant = merchants(:one)
    organization.campaigns.update_all(status: "ended")

    visit "/o/#{organization.slug}"

    within find("[data-testid='merchant-card']", text: merchant.name) do
      assert_selector "[data-testid='merchant-campaign-count']", text: "Sem campanhas aqui"
    end
  end

  test "merchant bottom sheet links to the merchant landing page" do
    organization = organizations(:one)
    merchant = merchants(:one)

    visit "/o/#{organization.slug}"

    marker = find(".leaflet-marker-icon", match: :first)
    marker.click

    within "[data-testid='merchant-sheet']" do
      click_on "Ver loja"
    end

    assert_current_path "/m/#{merchant.slug}"
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

  test "lists active OrganizationCampaign cards with prize highlight on the org landing" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}"

    within "[data-testid='campaigns-section']" do
      assert_text "Campanhas ativas"
      within "[data-testid='campaign-card']" do
        assert_text campaign.name
        assert_text campaigns(:pasaporte).prizes.order(:position).first.name
      end
    end
  end

  test "campaigns-empty copy when org has merchants but no active campaigns" do
    organization = organizations(:one)
    organization.organization_campaigns.update_all(status: "ended")

    visit "/o/#{organization.slug}"

    within "[data-testid='campaigns-section']" do
      assert_text "Nenhuma campanha ativa no momento"
    end
  end

  test "Locations-coming-soon copy when org has campaigns but no merchants on the map" do
    organization = organizations(:one)
    organization.merchants.update_all(latitude: nil, longitude: nil)

    visit "/o/#{organization.slug}"

    assert_selector "[data-testid='map-placeholder']"
    assert_text "Localizações em breve"
    # Ensure we are not in the all-empty state
    assert_no_selector "[data-testid='empty-state']"
  end

  test "merchant bottom sheet lists active OrganizationCampaign and LoyaltyCampaign at that merchant" do
    organization = organizations(:one)
    merchant = merchants(:one)
    org_campaign = campaigns(:pasaporte)
    loyalty = campaigns(:cartao_calzados)

    visit "/o/#{organization.slug}"

    marker = find(".leaflet-marker-icon", match: :first)
    marker.click

    within("[data-testid='merchant-sheet']") do
      assert_text merchant.name
      assert_text "Campanhas ativas neste lojista"
      links = all("[data-testid='sheet-campaign-link']")
      texts = links.map(&:text)
      assert(texts.any? { |t| t.include?(org_campaign.name) })
      assert(texts.any? { |t| t.include?(loyalty.name) })
    end
  end
end
