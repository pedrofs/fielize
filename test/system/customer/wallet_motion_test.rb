# frozen_string_literal: true

require "application_system_test_case"

class Customer::WalletMotionTest < ApplicationSystemTestCase
  # The wallet renders every card straight from the DB on each load, so a
  # "freshly earned" stamp is detected by comparing the current progress count
  # against the last count this device saw (persisted in localStorage). The
  # first open establishes the baseline; a later open after earning a stamp
  # surfaces a "+1" dot-fill accent on that card. A plain reload never replays it.
  test "earning a stamp between wallet opens surfaces a +1 dot-fill accent, gone on reload" do
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

    # Give that customer a loyalty card with 2 stamps (below the threshold of 5,
    # so it stays "collecting" in Ativas and renders a dot row).
    customer = Customer.find_by!(phone: "+5553934345656")
    Enrollment.create!(customer: customer, campaign: loyalty, consented_at: Time.current)
    2.times do |i|
      day_visit = Visit.create!(customer: customer, merchant: merchant, local_day: Date.current - (i + 1))
      Stamp.create!(
        visit: day_visit, campaign: loyalty, customer: customer, merchant: merchant,
        status: "confirmed", confirmed_at: Time.current
      )
    end

    # First open records the baseline (balance 2) — no accent on first sight.
    visit "/me"
    assert_selector "[data-testid='wallet-section-ativas']", wait: 5
    assert_no_selector "[data-testid='fresh-stamp-accent']"

    # Earn one more stamp, then reopen → a "+1" accent on that card.
    later_visit = Visit.create!(customer: customer, merchant: merchant, local_day: Date.current - 99)
    Stamp.create!(
      visit: later_visit, campaign: loyalty, customer: customer, merchant: merchant,
      status: "confirmed", confirmed_at: Time.current
    )

    visit "/me"
    assert_selector "[data-testid='fresh-stamp-accent']", text: "+1", wait: 5

    # A plain reload (no newly earned stamp) does not replay the accent.
    visit "/me"
    assert_selector "[data-testid='wallet-section-ativas']", wait: 5
    assert_no_selector "[data-testid='fresh-stamp-accent']"
  end
end
