# frozen_string_literal: true

require "test_helper"

class Customer::Organizations::Campaigns::EnrollmentsControllerTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  setup do
    @organization = organizations(:one)
    @campaign = campaigns(:pasaporte)
  end

  test "creates a Customer + Enrollment for an anonymous visitor and sets a signed cookie" do
    assert_difference -> { Customer.count }, +1 do
      assert_difference -> { Enrollment.count }, +1 do
        post customer_organization_campaign_enrollment_path(@organization.slug, @campaign.slug),
             params: { enrollment: { name: "Ana Pereira", phone: "(53) 90000-1234" } }
      end
    end

    assert_redirected_to customer_organization_campaign_path(@organization.slug, @campaign.slug)
    customer = Customer.find_by(phone: "+5553900001234")
    assert_not_nil customer
    assert_equal "Ana Pereira", customer.name
    enrollment = Enrollment.find_by(customer: customer, campaign: @campaign)
    assert_not_nil enrollment
    assert_not_nil enrollment.consented_at
    assert flash[:notice].present?
    assert cookies[Customer::Identifiable::COOKIE_KEY.to_s].present?
  end

  test "enqueues WhatsAppDeliveryJob for an unverified Customer" do
    assert_enqueued_with(job: WhatsAppDeliveryJob) do
      post customer_organization_campaign_enrollment_path(@organization.slug, @campaign.slug),
           params: { enrollment: { name: "Ana", phone: "(53) 90000-2345" } }
    end
  end

  test "attaches to an existing Customer when phone matches" do
    existing = customers(:maria)

    assert_no_difference -> { Customer.count } do
      assert_difference -> { Enrollment.count }, +1 do
        post customer_organization_campaign_enrollment_path(@organization.slug, @campaign.slug),
             params: { enrollment: { name: existing.name, phone: existing.phone } }
      end
    end

    assert Enrollment.exists?(customer: existing, campaign: @campaign)
  end

  test "rejects an invalid phone with an error redirect" do
    assert_no_difference -> { Customer.count } do
      assert_no_difference -> { Enrollment.count } do
        post customer_organization_campaign_enrollment_path(@organization.slug, @campaign.slug),
             params: { enrollment: { name: "Ana", phone: "not-a-phone" } }
      end
    end

    assert_redirected_to customer_organization_campaign_path(@organization.slug, @campaign.slug)
  end

  test "rejects a missing name with an error redirect" do
    assert_no_difference -> { Customer.count } do
      assert_no_difference -> { Enrollment.count } do
        post customer_organization_campaign_enrollment_path(@organization.slug, @campaign.slug),
             params: { enrollment: { phone: "(53) 90000-1111" } }
      end
    end

    assert_redirected_to customer_organization_campaign_path(@organization.slug, @campaign.slug)
    errors = session[:inertia_errors] || {}
    assert (errors[:name] || errors["name"]).present?,
      "expected an inertia error on the name field, got #{errors.inspect}"
  end

  test "uses the cookie-identified Customer for follow-up enrollments without re-asking for phone or name" do
    # First request enrolls and sets the signed cookie via Customer.identify_for.
    post customer_organization_campaign_enrollment_path(@organization.slug, @campaign.slug),
         params: { enrollment: { name: customers(:maria).name, phone: customers(:maria).phone } }

    second_campaign = campaigns(:cartao_calzados)
    # Subsequent request reuses the cookie — no phone or name in params.
    assert_no_difference -> { Customer.count } do
      assert_difference -> { Enrollment.count }, +1 do
        post customer_organization_campaign_enrollment_path(@organization.slug, second_campaign.slug),
             params: { enrollment: {} }
      end
    end

    assert Enrollment.exists?(customer: customers(:maria), campaign: second_campaign)
  end

  test "404s when the campaign is not active" do
    @campaign.update!(status: "draft")

    post customer_organization_campaign_enrollment_path(@organization.slug, @campaign.slug),
         params: { enrollment: { name: "Ana", phone: "(53) 90000-3456" } }
    assert_response :not_found
  end
end
