# frozen_string_literal: true

require "application_system_test_case"

class Customer::WalletCelebrationTest < ApplicationSystemTestCase
  # The wallet renders won/redeemable cards straight from the DB on every load,
  # so the one-shot celebration is keyed to localStorage (which card ids were
  # already celebrated) rather than to an in-session pending→confirmed edge.
  test "a newly redeemable card celebrates once at /me, and a reload does not replay it" do
    organization = organizations(:one)
    pasaporte = campaigns(:pasaporte)
    loyalty = campaigns(:cartao_calzados)
    merchant = merchants(:one)

    # Enrolling through the real flow sets the signed customer cookie.
    visit "/o/#{organization.slug}/c/#{pasaporte.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 93434-5656"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    # Give that customer a loyalty card past its redemption threshold (5).
    customer = Customer.find_by!(phone: "+5553934345656")
    Enrollment.create!(customer: customer, campaign: loyalty, consented_at: Time.current)
    5.times do |i|
      day_visit = Visit.create!(customer: customer, merchant: merchant, local_day: Date.current - (i + 1))
      Stamp.create!(
        visit: day_visit, campaign: loyalty, customer: customer, merchant: merchant,
        status: "confirmed", confirmed_at: Time.current
      )
    end

    visit "/me"
    assert_selector "[data-testid='wallet-section-para-resgatar']", wait: 5
    assert_selector "[data-testid='wallet-celebration']", wait: 5

    # A reload renders the same redeemable card but must not celebrate again.
    visit "/me"
    assert_selector "[data-testid='wallet-section-para-resgatar']", wait: 5
    assert_no_selector "[data-testid='wallet-celebration']"
  end
end
