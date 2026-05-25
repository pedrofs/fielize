# frozen_string_literal: true

require "test_helper"
require "inertia_rails/minitest"

class Customer::OrganizationsControllerTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  test "show responds 200 without authentication" do
    get "/o/#{organizations(:one).slug}"
    assert_response :success
  end

  test "show 404s for unknown slug" do
    get "/o/does-not-exist"
    assert_response :not_found
  end

  test "serializes days_remaining for each campaign card from its end date" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    campaign.update!(ends_at: 3.days.from_now.change(hour: 12))

    get "/o/#{organization.slug}"
    assert_response :success
    assert_inertia_props do |props|
      card = props[:campaigns].find { |c| c[:id] == campaign.id }
      assert_equal 3, card[:days_remaining]
    end
  end

  test "omits per-customer progress for an unidentified visitor" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    get "/o/#{organization.slug}"
    assert_response :success
    assert_inertia_props do |props|
      card = props[:campaigns].find { |c| c[:id] == campaign.id }
      assert_nil card[:progress]
    end
  end

  test "serializes the enrolled customer's own progress on each campaign card" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    customer = customers(:joao)
    sign_in_as_customer(customer, campaign)
    campaign.enroll!(customer: customer)

    get "/o/#{organization.slug}"
    assert_response :success
    assert_inertia_props do |props|
      card = props[:campaigns].find { |c| c[:id] == campaign.id }
      assert_equal "cumulative", card[:progress][:kind]
      assert_equal 0, card[:progress][:merchants_stamped]
      assert_equal 6, card[:progress][:next_threshold]
    end
  end

  private

  # Pre-warm the signed customer cookie via the enrollment flow, then clear the
  # side-effect Enrollment so the test controls the initial state.
  def sign_in_as_customer(customer, campaign)
    post customer_organization_campaign_enrollment_path(campaign.organization.slug, campaign.slug),
         params: { enrollment: { name: customer.name, phone: customer.phone } }
    Enrollment.where(customer: customer).delete_all
  end
end
