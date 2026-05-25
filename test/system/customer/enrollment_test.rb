# frozen_string_literal: true

require "application_system_test_case"

class Customer::EnrollmentTest < ApplicationSystemTestCase
  include ActiveJob::TestHelper

  test "anonymous Customer enrolls via the form: page morphs to enrolled state, toast confirms WhatsApp dispatch, cookie + Enrollment + job persist" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    phone = "(53) 91212-3434"

    visit "/o/#{organization.slug}/c/#{campaign.slug}"

    assert_selector "[data-testid='enroll-form']"

    assert_difference -> { Enrollment.count }, +1 do
      assert_difference -> { Customer.count }, +1 do
        assert_enqueued_with(job: WhatsAppDeliveryJob) do
          fill_in "Nome", with: "Ana Souza"
          fill_in "WhatsApp", with: phone
          find("[data-testid='enroll-cta']").click
          assert_selector "[data-testid='enrolled-state']", wait: 5
        end
      end
    end

    customer = Customer.find_by(phone: "+5553912123434")
    assert_not_nil customer
    assert_equal "Ana Souza", customer.name
    assert Enrollment.exists?(customer: customer, campaign: campaign)

    assert_selector "[data-sonner-toast]"
    assert_text(/inscrição confirmada/i)
    assert_no_selector "[data-testid='enroll-form']"
  end

  test "rejects an obviously bogus phone client-side before submitting" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}/c/#{campaign.slug}"

    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "12"
    find("[data-testid='enroll-cta']").click

    assert_selector "[data-testid='enroll-error']"
    assert_no_selector "[data-testid='enrolled-state']"
  end

  test "recognized Customer enrolling on a different Organization's Campaign skips phone re-entry" do
    organization_a = organizations(:one)
    campaign_a = campaigns(:pasaporte)

    # Use a fresh org/campaign so we exercise true cross-org recognition.
    organization_b = Organization.create!(name: "Outra Org", slug: "outra-org")
    merchant_b = organization_b.merchants.create!(
      name: "Café Outra",
      slug: "cafe-outra",
      latitude: -30.034,
      longitude: -51.220
    )
    campaign_b = OrganizationCampaign.create!(
      organization: organization_b,
      name: "Campanha B",
      starts_at: 1.day.ago,
      ends_at:   1.month.from_now,
      entry_policy: "cumulative"
    )
    campaign_b.prizes.create!(name: "Prêmio", threshold: 6)
    campaign_b.merchants << merchant_b
    campaign_b.activate!

    visit "/o/#{organization_a.slug}/c/#{campaign_a.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 91313-2424"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    visit "/o/#{organization_b.slug}/c/#{campaign_b.slug}"

    # Phone field is gone — recognized customer.
    assert_no_selector "[data-testid='enroll-phone-input']"

    assert_difference -> { Enrollment.count }, +1 do
      find("[data-testid='enroll-cta']").click
      assert_selector "[data-testid='enrolled-state']", wait: 5
    end

    customer = Customer.find_by(phone: "+5553913132424")
    assert Enrollment.exists?(customer: customer, campaign: campaign_b)
  end

  test "enrolled Customer revisiting the org page sees the Enrolled badge and Continuar CTA" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}/c/#{campaign.slug}"
    fill_in "Nome", with: "Ana"
    fill_in "WhatsApp", with: "(53) 91414-5454"
    find("[data-testid='enroll-cta']").click
    assert_selector "[data-testid='enrolled-state']", wait: 5

    visit "/o/#{organization.slug}"

    within "[data-testid='campaign-card']" do
      assert_selector "[data-testid='enrolled-badge']"
      assert_text "Continuar"
    end
  end
end
