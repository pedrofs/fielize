# frozen_string_literal: true

require "application_system_test_case"

class Customer::VerificationTest < ApplicationSystemTestCase
  include ActiveJob::TestHelper

  test "tapping a valid token verifies the customer and shows the confirmation page" do
    customer = customers(:maria)
    refute customer.verified?
    token = customer.generate_verification_token

    visit "/v/#{token}"

    assert_selector "[data-testid='verification-confirmed']", wait: 5
    assert customer.reload.verified?
  end

  test "tapping an expired link shows the expired page; tapping resend re-enqueues the WhatsApp job" do
    customer = customers(:maria)
    token = customer.generate_verification_token

    travel (Customer::VerificationToken::TTL + 1.minute) do
      visit "/v/#{token}"

      assert_selector "[data-testid='verification-expired']", wait: 5
      refute customer.reload.verified?

      assert_enqueued_with(job: WhatsAppDeliveryJob, args: [ { customer_id: customer.id } ]) do
        find("[data-testid='verification-resend']").click
        assert_selector "[data-testid='verification-requested']", wait: 5
      end
    end
  end

  test "tapping a tampered link shows the generic invalid page" do
    customer = customers(:maria)
    token = customer.generate_verification_token
    tampered = token.sub(/.$/, "x")

    visit "/v/#{tampered}"

    assert_selector "[data-testid='verification-invalid']", wait: 5
    refute customer.reload.verified?
  end

  test "verification is non-blocking: an unverified Customer can still browse and enroll" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}/c/#{campaign.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 91515-6767"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    customer = Customer.find_by(phone: "+5553915156767")
    assert_not_nil customer
    refute customer.verified?

    # Customer keeps browsing the org without being forced to verify.
    visit "/o/#{organization.slug}"
    assert_selector "[data-testid='enrolled-badge']"
  end
end
