# frozen_string_literal: true

require "application_system_test_case"

class Organizations::CampaignCreationTest < ApplicationSystemTestCase
  setup do
    @org = organizations(:one)
    @merchant = merchants(:one)
  end

  test "new campaign form renders the policy options and prize controls" do
    sign_in_as(users(:admin))

    visit new_organizations_campaign_path

    # The entry-policy radios are now shadcn RadioGroup items (Radix), so
    # this also guards against the component swap breaking at runtime.
    assert_selector "#entry_policy_cumulative"
    assert_selector "#entry_policy_simple"
    assert_text "Acumulativa"
    assert_text "Simples"
    assert_text "Exigir validação do lojista a cada check-in"
    assert_button "Adicionar prêmio"
    assert_button "Salvar como rascunho"
  end

  test "draft missing a participating merchant cannot be activated yet" do
    sign_in_as(users(:admin))

    draft = OrganizationCampaign.create!(
      organization: @org, name: "Falta Lojista", slug: "falta-lojista",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    draft.prizes.create!(name: "Prêmio", threshold: 3, position: 0)

    visit organizations_campaign_path(draft)

    assert_selector "[data-testid='activation-checklist']"
    assert_text "Pelo menos 1 lojista participante"
    assert_button "Ativar", disabled: true
  end

  test "a complete draft activates and confirms" do
    sign_in_as(users(:admin))

    draft = OrganizationCampaign.create!(
      organization: @org, name: "Pronta", slug: "pronta",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    draft.prizes.create!(name: "Prêmio", threshold: 3, position: 0)
    CampaignMerchant.create!(organization_campaign: draft, merchant: @merchant)

    visit organizations_campaign_path(draft)

    assert_text "Tudo pronto para ativar."
    click_button "Ativar"

    # Flash is now surfaced (previously the notice was never rendered).
    assert_text "Campanha ativada.", wait: 5
    assert_button "Encerrar", wait: 5
    assert draft.reload.active?
  end
end
