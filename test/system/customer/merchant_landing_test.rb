# frozen_string_literal: true

require "application_system_test_case"

class Customer::MerchantLandingTest < ApplicationSystemTestCase
  test "stamp confirmation celebrates once, then a reload shows the calm landing" do
    merchant = merchants(:one)

    # State 3 → identify + claim in one shot, landing on the pending code (state 6).
    visit "/m/#{merchant.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 91515-6767"
    find("[data-testid='merchant-claim-cta']").click
    assert_selector "[data-testid='merchant-pending-code']", wait: 5

    # A merchant-side confirmation happens while the page polls.
    customer = Customer.find_by!(phone: "+5553915156767")
    code = Visit.find_by!(customer: customer, merchant: merchant).stamps.first.code
    merchant.confirm_stamps(code: code)

    # The pending→confirmed transition fires the one-shot celebration…
    assert_selector "[data-testid='merchant-celebration']", wait: 6
    # …which auto-dismisses to reveal the calm landing underneath.
    assert_no_selector "[data-testid='merchant-celebration']", wait: 6
    assert_selector "[data-testid='merchant-calm-confirmed']"
    assert_text "volte amanhã"

    # A refresh is idempotent: calm landing, no replayed celebration, no claim CTA.
    visit "/m/#{merchant.slug}"
    assert_selector "[data-testid='merchant-calm-confirmed']", wait: 5
    assert_no_selector "[data-testid='merchant-celebration']"
    assert_no_selector "[data-testid='merchant-claim-cta']"
  end

  test "a name error renders under the name field, not the phone field" do
    merchant = merchants(:one)

    visit "/m/#{merchant.slug}"

    # Whitespace satisfies the HTML `required` guard but fails our trim check,
    # so the client-side name error fires and must land under the name field.
    fill_in "Nome", with: "   "
    fill_in "WhatsApp", with: "(53) 91515-6767"
    find("[data-testid='merchant-claim-cta']").click

    assert_selector "[data-testid='merchant-name-error']", text: "Informe seu nome"
    assert_no_selector "[data-testid='merchant-phone-error']"
  end
end
