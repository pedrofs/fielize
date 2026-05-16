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

  test "Adicionar todos bulk-attaches every unattached merchant after a confirm dialog" do
    sign_in_as(users(:admin))

    # Two extra merchants in the same org so there is something concrete to bulk-add.
    Merchant.create!(
      organization: @org, name: "Padaria Bulk", slug: "padaria-bulk",
      address: "Rua B, 2", latitude: -32.5614, longitude: -53.3756
    )
    Merchant.create!(
      organization: @org, name: "Sapataria Bulk", slug: "sapataria-bulk",
      address: "Rua C, 3", latitude: -32.5614, longitude: -53.3756
    )

    empty_campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Bulk Add Target",
      slug: "bulk-add-target",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      status: "draft"
    )
    expected_count = @org.merchants.count

    visit organizations_campaign_path(empty_campaign)

    assert_selector "[data-testid='add-all-merchants-button']"
    click_on "Adicionar todos"

    within "[data-testid='add-all-merchants-dialog']" do
      assert_selector "[data-testid='add-all-merchants-dialog-body']",
                      text: "Adicionar #{expected_count} lojistas à campanha?"
      find("[data-testid='add-all-merchants-confirm']").click
    end

    assert_selector "[data-testid='merchants-table']", wait: 5
    assert_equal expected_count, empty_campaign.reload.merchant_ids.size
  end

  test "Adicionar todos is disabled with an explanatory tooltip when nothing is unattached" do
    sign_in_as(users(:admin))

    full_campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Bulk Full",
      slug: "bulk-full",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      status: "draft"
    )
    @org.merchants.find_each do |m|
      CampaignMerchant.create!(organization_campaign: full_campaign, merchant: m)
    end

    visit organizations_campaign_path(full_campaign)

    assert_selector "[data-testid='add-all-merchants-button'][disabled]"
    find("[data-testid='add-all-merchants-disabled-wrapper']").hover
    assert_selector "[data-testid='add-all-merchants-tooltip']", text: "Todos os lojistas já participam."
  end

  test "draft campaign renders a trash icon per merchant row and removal works after confirm" do
    sign_in_as(users(:admin))

    draft_campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Draft Remove",
      slug: "draft-remove",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      status: "draft"
    )
    CampaignMerchant.create!(organization_campaign: draft_campaign, merchant: @attached_merchant)

    visit organizations_campaign_path(draft_campaign)

    assert_selector "[data-testid='merchant-remove-#{@attached_merchant.id}']"

    accept_confirm do
      find("[data-testid='merchant-remove-#{@attached_merchant.id}']").click
    end

    assert_no_selector "[data-testid='merchant-row-#{@attached_merchant.id}']", wait: 5
    refute_includes draft_campaign.reload.merchant_ids, @attached_merchant.id
  end

  test "active campaign does not render the trash icon" do
    sign_in_as(users(:admin))

    visit organizations_campaign_path(@campaign)

    assert_selector "[data-testid='merchant-row-#{@attached_merchant.id}']"
    assert_no_selector "[data-testid='merchant-remove-#{@attached_merchant.id}']"
  end

  test "ended campaign does not render the trash icon" do
    sign_in_as(users(:admin))

    ended_campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Ended Hide Trash",
      slug: "ended-hide-trash",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      status: "draft"
    )
    ended_campaign.prizes.create!(name: "Tier", threshold: 6)
    CampaignMerchant.create!(organization_campaign: ended_campaign, merchant: @attached_merchant)
    ended_campaign.activate!
    ended_campaign.end!
    assert ended_campaign.ended?

    visit organizations_campaign_path(ended_campaign)

    assert_selector "[data-testid='merchant-row-#{@attached_merchant.id}']"
    assert_no_selector "[data-testid='merchant-remove-#{@attached_merchant.id}']"
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
