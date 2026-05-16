# frozen_string_literal: true

require "application_system_test_case"

class Organizations::CampaignShowTest < ApplicationSystemTestCase
  setup do
    @org = organizations(:one)
    @campaign = campaigns(:pasaporte)
    @attached_merchant = merchants(:one)
  end

  test "show page renders the participating merchants table with the expected columns" do
    sign_in_as(users(:admin))

    visit organizations_campaign_path(@campaign)

    assert_text "Lojistas participantes"
    assert_selector "[data-testid='merchants-table']"
    within "[data-testid='merchants-table']" do
      assert_text "Lojista"
      assert_text "Stamps confirmados"
      assert_text "Clientes distintos"
      assert_text "Entrou em"
    end

    assert_selector "[data-testid='merchant-row-#{@attached_merchant.id}']"
    within "[data-testid='merchant-row-#{@attached_merchant.id}']" do
      assert_link @attached_merchant.name, href: "/organizations/merchants/#{@attached_merchant.id}"
      # One confirmed fixture stamp from maria at calzados.
      assert_text "1"
    end
  end

  test "show page renders the empty state when no merchants are attached" do
    sign_in_as(users(:admin))

    empty_campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Sem lojistas",
      slug: "sem-lojistas",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      status: "draft"
    )

    visit organizations_campaign_path(empty_campaign)

    assert_no_selector "[data-testid='merchants-table']"
    assert_selector "[data-testid='merchants-empty']", text: "Ainda não há lojistas nesta campanha."
  end

  test "selecting a merchant from the combobox attaches it and removes it from the option set" do
    sign_in_as(users(:admin))

    new_merchant = Merchant.create!(
      organization: @org, name: "Padaria do Mercado", slug: "padaria-do-mercado",
      address: "Rua A, 1", latitude: -32.5614, longitude: -53.3756
    )

    empty_campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Combobox Target",
      slug: "combobox-target",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      status: "draft"
    )

    visit organizations_campaign_path(empty_campaign)

    assert_selector "[data-testid='campaign-merchant-combobox']"
    find("[data-testid='campaign-merchant-combobox']").click
    find("[data-testid='campaign-merchant-combobox-option-#{new_merchant.id}']").click

    assert_selector "[data-testid='merchant-row-#{new_merchant.id}']", wait: 5
    assert empty_campaign.reload.merchant_ids.include?(new_merchant.id)

    # Reopen the combobox; the just-attached merchant must not appear in the option set.
    find("[data-testid='campaign-merchant-combobox']").click
    assert_no_selector "[data-testid='campaign-merchant-combobox-option-#{new_merchant.id}']"
  end
end
