# frozen_string_literal: true

require "application_system_test_case"

class Customer::ProfileTest < ApplicationSystemTestCase
  include ActiveJob::TestHelper

  test "an enrolled, unverified Customer sees their enrollments at /me and their identity on /me/perfil; tapping resend re-enqueues the WhatsApp job" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}/c/#{campaign.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 91616-7878"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    visit "/me"
    assert_selector "[data-testid='wallet-sections']"
    assert_text organization.name
    assert_text campaign.name

    # The Perfil tab is reachable from the bottom toolbar.
    find("[data-testid='toolbar-tab-perfil']").click

    assert_selector "[data-testid='profile']"
    assert_selector "[data-testid='profile-verification-resend']"

    assert_enqueued_with(job: WhatsAppDeliveryJob) do
      find("[data-testid='profile-verification-resend']").click
      assert_text "Enviamos um novo link para o seu WhatsApp.", wait: 5
    end
  end

  test "the shared flash toast is dismissible" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}/c/#{campaign.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 92020-1212"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    visit "/me/perfil"
    find("[data-testid='profile-verification-resend']").click

    assert_selector "[data-sonner-toast]", wait: 5
    assert_text "Enviamos um novo link para o seu WhatsApp."

    find("[data-close-button]").click

    assert_no_selector "[data-sonner-toast]"
  end

  test "editing the display name on /me/perfil persists the change" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}/c/#{campaign.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 91818-9090"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    visit "/me/perfil"
    fill_in "Nome", with: "Ana Maria"
    find("[data-testid='profile-name-save']").click

    assert_selector "[data-testid='profile-name-saved']", wait: 5
    assert_equal "Ana Maria", Customer.find_by(phone: "+5553918189090").name
  end

  test "tapping 'Forget me on this device' clears the cookie and the page reverts to the placeholder" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}/c/#{campaign.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 91717-8989"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    visit "/me/perfil"
    assert_selector "[data-testid='profile']"

    find("[data-testid='profile-forget-me']").click

    assert_selector "[data-testid='profile-placeholder']", wait: 5
    assert_no_selector "[data-testid='profile']"
  end

  test "a visitor with no cookie sees the placeholder copy on /me" do
    visit "/me"
    assert_selector "[data-testid='wallet-placeholder']"
    assert_no_selector "[data-testid='wallet-sections']"
  end

  test "a verified Customer sees the Verified banner instead of the resend affordance" do
    customer = customers(:joao)
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    Enrollment.create!(customer: customer, campaign: campaign, consented_at: Time.current)

    # Set the signed cookie via a real request rather than fabricating one.
    visit "/o/#{organization.slug}/c/#{campaign.slug}"
    fill_in "Nome", with: customer.name
    fill_in "WhatsApp", with: customer.phone
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    visit "/me/perfil"
    assert_selector "[data-testid='profile-verified-banner']"
    assert_no_selector "[data-testid='profile-verification-resend']"
  end

  test "the bottom toolbar renders and highlights the active tab" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}/c/#{campaign.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 91919-0101"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    visit "/me"
    assert_selector "[data-testid='customer-toolbar']"
    assert_equal "true", find("[data-testid='toolbar-tab-cartoes']")["data-active"]

    find("[data-testid='toolbar-tab-perfil']").click
    assert_selector "[data-testid='profile']"
    assert_equal "true", find("[data-testid='toolbar-tab-perfil']")["data-active"]
  end
end
