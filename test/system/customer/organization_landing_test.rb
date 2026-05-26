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
    open_merchant_map

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
    open_merchant_map

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

  test "shows a days-remaining urgency hint for a soon-ending campaign" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    campaign.update!(ends_at: 3.days.from_now.change(hour: 12))

    visit "/o/#{organization.slug}"

    within "[data-testid='campaign-card']" do
      assert_selector "[data-testid='campaign-card-deadline']", text: "Encerra em 3 dias"
    end
  end

  test "omits the urgency hint for a campaign ending far in the future" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    campaign.update!(ends_at: 6.months.from_now)

    visit "/o/#{organization.slug}"

    within "[data-testid='campaign-card']" do
      assert_no_selector "[data-testid='campaign-card-deadline']"
    end
  end

  test "enrolled campaign card shows the customer's own progress in place of a static badge" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}/c/#{campaign.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 91616-7878"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    visit "/o/#{organization.slug}"

    within "[data-testid='campaign-card']" do
      assert_selector "[data-testid='enrolled-badge']", text: "0/6 lojas"
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
    open_merchant_map

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

  test "merchant cards are rendered above the map" do
    organization = organizations(:one)

    visit "/o/#{organization.slug}"

    assert_selector "[data-testid='merchant-card']"
    assert_selector "[data-testid='map-toggle']"
    body = page.body
    assert(
      body.index("merchant-card") < body.index("map-toggle"),
      "expected the merchant cards to appear before the map toggle"
    )
  end

  test "the map is collapsed by default and expands/collapses via the toggle" do
    organization = organizations(:one)

    visit "/o/#{organization.slug}"

    assert_no_selector "[data-testid='merchants-map']"
    assert_selector "[data-testid='map-toggle']", text: "Ver no mapa"

    find("[data-testid='map-toggle']").click
    assert_selector "[data-testid='merchants-map']"
    assert_selector "[data-testid='map-toggle']", text: "Ocultar mapa"

    find("[data-testid='map-toggle']").click
    assert_no_selector "[data-testid='merchants-map']"
  end

  test "tapping a card's map-pin reveals the map and highlights that card" do
    organization = organizations(:one)

    visit "/o/#{organization.slug}"

    assert_no_selector "[data-testid='merchants-map']"
    find("[data-testid='merchant-locate']").click

    assert_selector "[data-testid='merchants-map']"
    assert_selector "[data-testid='merchant-row'][data-selected='true']"
  end

  test "tapping a marker highlights the corresponding merchant card" do
    organization = organizations(:one)
    merchant = merchants(:one)

    visit "/o/#{organization.slug}"
    open_merchant_map

    find(".leaflet-marker-icon", match: :first).click

    within "[data-testid='merchant-row'][data-selected='true']" do
      assert_text merchant.name
    end
  end

  test "with several mappable merchants each renders a marker and only the chosen card is highlighted" do
    organization = organizations(:one)
    organization.merchants.create!(
      name: "Segunda Loja",
      address: "Av. 20 de Setembro, 200, Jaguarão",
      latitude: -32.5650,
      longitude: -53.3800
    )

    visit "/o/#{organization.slug}"

    assert_selector "[data-testid='merchant-row']", count: 2

    all("[data-testid='merchant-locate']").last.click

    assert_selector "[data-testid='merchants-map']"
    assert_css ".leaflet-marker-icon", count: 2

    selected = all("[data-testid='merchant-row'][data-selected='true']")
    assert_equal 1, selected.size
    selected.first.assert_text("Segunda Loja")
  end

  private

  def open_merchant_map
    find("[data-testid='map-toggle']").click
    assert_selector "[data-testid='merchants-map']"
  end
end
