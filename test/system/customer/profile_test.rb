# frozen_string_literal: true

require "application_system_test_case"

class Customer::ProfileTest < ApplicationSystemTestCase
  include ActiveJob::TestHelper

  test "an enrolled, unverified Customer visiting /me sees their Enrollments and verification banner; tapping resend re-enqueues the WhatsApp job" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}/c/#{campaign.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 91616-7878"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    visit "/me"

    assert_selector "[data-testid='profile-enrollments']"
    assert_text organization.name
    assert_text campaign.name

    assert_selector "[data-testid='profile-verification-resend']"

    assert_enqueued_with(job: WhatsAppDeliveryJob) do
      find("[data-testid='profile-verification-resend']").click
      assert_selector "[data-testid='flash-toast']", wait: 5
    end
  end

  test "tapping 'Forget me on this device' clears the cookie and the page reverts to the placeholder" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}/c/#{campaign.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 91717-8989"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    visit "/me"
    assert_selector "[data-testid='profile-enrollments']"

    find("[data-testid='profile-forget-me']").click

    assert_selector "[data-testid='profile-placeholder']", wait: 5
    assert_no_selector "[data-testid='profile-enrollments']"
  end

  test "a visitor with no cookie sees the placeholder copy on /me" do
    visit "/me"
    assert_selector "[data-testid='profile-placeholder']"
    assert_no_selector "[data-testid='profile-enrollments']"
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

    visit "/me"
    assert_selector "[data-testid='profile-verified-banner']"
    assert_no_selector "[data-testid='profile-verification-resend']"
  end
end
