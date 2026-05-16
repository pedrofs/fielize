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

  test "no cookie with valid phone — identifies, sets cookie, creates Visit + Stamps + Enrollments" do
    new_phone = "(53) 90000-7890"

    assert_difference -> { Customer.count }, +1 do
      assert_difference -> { Visit.count }, +1 do
        assert_difference -> { Stamp.count }, +2 do
          assert_difference -> { Enrollment.count }, +2 do
            post customer_merchant_visit_path(@merchant.slug),
                 params: { visit: { name: "Novo Cliente", phone: new_phone } }
          end
        end
      end
    end

    assert_redirected_to customer_merchant_path(@merchant.slug)
    assert cookies[Customer::Identifiable::COOKIE_KEY.to_s].present?

    customer = Customer.find_by(phone: "+5553900007890")
    assert_not_nil customer
    assert_equal "Novo Cliente", customer.name
    assert Enrollment.exists?(customer: customer, campaign: @org_campaign)
    assert Enrollment.exists?(customer: customer, campaign: @loyalty)
  end

  test "no cookie with invalid phone — no Visit, no Customer, no cookie, redirect with errors" do
    assert_no_difference -> { Customer.count } do
      assert_no_difference -> { Visit.count } do
        assert_no_difference -> { Stamp.count } do
          post customer_merchant_visit_path(@merchant.slug),
               params: { visit: { name: "Ana", phone: "not-a-phone" } }
        end
      end
    end

    assert_redirected_to customer_merchant_path(@merchant.slug)
    assert cookies[Customer::Identifiable::COOKIE_KEY.to_s].blank?
    errors = session[:inertia_errors] || {}
    assert (errors[:phone] || errors["phone"]).present?,
      "expected an inertia error on the phone field, got #{errors.inspect}"
  end

  test "no cookie with missing name — no Visit, no Customer, redirect with errors" do
    assert_no_difference -> { Customer.count } do
      assert_no_difference -> { Visit.count } do
        post customer_merchant_visit_path(@merchant.slug),
             params: { visit: { phone: "(53) 90000-5555" } }
      end
    end

    assert_redirected_to customer_merchant_path(@merchant.slug)
    errors = session[:inertia_errors] || {}
    assert (errors[:name] || errors["name"]).present?,
      "expected an inertia error on the name field, got #{errors.inspect}"
  end

  test "no cookie with valid phone for a Customer with a confirmed Visit today — sets cookie, no duplicate Visit" do
    # @customer already exists with phone +5553999990000 from the fixture.
    Visit.create_from_scan!(customer: @customer, merchant: @merchant).tap do |visit|
      @merchant.confirm_stamps(code: visit.stamps.first.code)
    end

    assert_no_difference -> { Customer.count } do
      assert_no_difference -> { Visit.count } do
        post customer_merchant_visit_path(@merchant.slug),
             params: { visit: { name: @customer.name, phone: @customer.phone } }
      end
    end

    assert_redirected_to customer_merchant_path(@merchant.slug)
    assert cookies[Customer::Identifiable::COOKIE_KEY.to_s].present?
  end

  private

  def sign_in_as_customer(customer)
    post customer_organization_campaign_enrollment_path(@org_campaign.organization.slug, @org_campaign.slug),
         params: { enrollment: { name: customer.name, phone: customer.phone } }
    Enrollment.where(customer: customer).delete_all
  end
end
