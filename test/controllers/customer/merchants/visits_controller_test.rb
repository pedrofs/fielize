# frozen_string_literal: true

require "test_helper"

class Customer::Merchants::VisitsControllerTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  setup do
    @merchant = merchants(:one)
    @customer = customers(:joao)
    @org_campaign = campaigns(:pasaporte)
    @loyalty = campaigns(:cartao_calzados)
  end

  test "404s for an unknown merchant slug" do
    sign_in_as_customer(@customer)
    post "/m/does-not-exist/visit"
    assert_response :not_found
  end

  test "identified Customer with all matching campaigns enrolled — creates Visit + Stamps and redirects" do
    sign_in_as_customer(@customer)
    @org_campaign.enroll!(customer: @customer)
    @loyalty.enroll!(customer: @customer)

    assert_difference -> { Visit.count }, +1 do
      assert_difference -> { Stamp.count }, +2 do
        post customer_merchant_visit_path(@merchant.slug)
      end
    end

    assert_redirected_to customer_merchant_path(@merchant.slug)
  end

  test "identified Customer with some matching unenrolled — backfills Enrollments and creates Stamps" do
    sign_in_as_customer(@customer)
    @org_campaign.enroll!(customer: @customer) # loyalty stays unenrolled

    assert_difference -> { Visit.count }, +1 do
      assert_difference -> { Stamp.count }, +2 do
        assert_difference -> { Enrollment.count }, +1 do
          post customer_merchant_visit_path(@merchant.slug)
        end
      end
    end

    assert Enrollment.exists?(customer: @customer, campaign: @loyalty)
  end

  test "identified Customer with a confirmed Visit today — no duplicate, just redirects" do
    sign_in_as_customer(@customer)
    visit = Visit.create_from_scan!(customer: @customer, merchant: @merchant)
    @merchant.confirm_stamps(code: visit.stamps.first.code)

    assert_no_difference -> { Visit.count } do
      assert_no_difference -> { Stamp.count } do
        post customer_merchant_visit_path(@merchant.slug)
      end
    end

    assert_redirected_to customer_merchant_path(@merchant.slug)
  end

  test "identified Customer at a Merchant with no active campaigns — creates an empty Visit, redirects" do
    sign_in_as_customer(@customer)
    @org_campaign.update!(status: "ended")
    @loyalty.update!(status: "ended")

    assert_difference -> { Visit.count }, +1 do
      assert_no_difference -> { Stamp.count } do
        post customer_merchant_visit_path(@merchant.slug)
      end
    end

    assert_redirected_to customer_merchant_path(@merchant.slug)
  end

  test "no cookie — graceful no-op redirect, no Visit created" do
    assert_no_difference -> { Visit.count } do
      assert_no_difference -> { Customer.count } do
        post customer_merchant_visit_path(@merchant.slug)
      end
    end

    assert_redirected_to customer_merchant_path(@merchant.slug)
  end

  private

  def sign_in_as_customer(customer)
    post customer_organization_campaign_enrollment_path(@org_campaign.organization.slug, @org_campaign.slug),
         params: { enrollment: { phone: customer.phone } }
    Enrollment.where(customer: customer).delete_all
  end
end
