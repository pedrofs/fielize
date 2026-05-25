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

  test "state 5 surfaces the customer's progress at this merchant before the claim CTA" do
    merchant = merchants(:one)

    # Enroll in the org campaign (sets the customer cookie) without claiming a
    # Visit, so revisiting the merchant lands in state 5 — loyalty still unenrolled.
    visit "/o/cdl-jaguarao/c/pasaporte-2026"
    fill_in "Nome", with: "Bea"
    fill_in "WhatsApp", with: "(53) 92020-3030"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    visit "/m/#{merchant.slug}"
    assert_selector "[data-testid='merchant-page-state-5']", wait: 5

    # A brand-new customer has zero progress → the "Comece agora" framing
    # (rendered uppercase by CSS) with a forward-looking goal hint, rather than
    # an empty block.
    progress = find("[data-testid='merchant-progress']")
    assert progress.text.include?("COMECE AGORA")
    assert progress.text.include?("pro prêmio")

    # The claim CTA lives in a form that is a later sibling of the progress
    # block — i.e. progress renders before the CTA.
    assert_selector "[data-testid='merchant-progress'] ~ form [data-testid='merchant-claim-cta']"
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
