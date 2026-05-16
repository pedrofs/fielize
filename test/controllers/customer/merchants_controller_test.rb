# frozen_string_literal: true

require "test_helper"
require "inertia_rails/minitest"

class Customer::MerchantsControllerTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  setup do
    @merchant = merchants(:one)
    @customer = customers(:joao)
    @org_campaign = campaigns(:pasaporte)
    @loyalty = campaigns(:cartao_calzados)
  end

  test "show 404s for an unknown merchant slug" do
    get "/m/does-not-exist"
    assert_response :not_found
  end

  test "state 2 — Merchant with no active matching campaigns renders the empty state" do
    @org_campaign.update!(status: "ended")
    @loyalty.update!(status: "ended")

    get "/m/#{@merchant.slug}"
    assert_response :success
    assert_inertia_props page_state: 2
    assert_inertia_props campaigns: []
  end

  test "state 3 — no cookie + active matching campaigns serializes the form-render props" do
    get "/m/#{@merchant.slug}"
    assert_response :success
    assert_inertia_props page_state: 3
    assert_inertia_props do |props|
      ids = props[:campaigns].map { |c| c[:id] }.sort
      expected = [ @org_campaign.id, @loyalty.id ].sort
      assert_equal expected, ids
      assert props[:campaigns].none? { |c| c[:enrolled] }
      assert_nil props[:visit]
    end
  end

  test "state 4 — identified Customer with no Visit and all matching campaigns enrolled" do
    sign_in_as_customer(@customer)
    @org_campaign.enroll!(customer: @customer)
    @loyalty.enroll!(customer: @customer)

    get "/m/#{@merchant.slug}"
    assert_response :success
    assert_inertia_props page_state: 4
    assert_inertia_props do |props|
      ids = props[:campaigns].map { |c| c[:id] }.sort
      expected = [ @org_campaign.id, @loyalty.id ].sort
      assert_equal expected, ids
      assert props[:campaigns].all? { |c| c[:enrolled] }
    end
  end

  test "state 5 — identified Customer with no Visit and some unenrolled campaigns" do
    sign_in_as_customer(@customer)
    @org_campaign.enroll!(customer: @customer) # loyalty stays unenrolled

    get "/m/#{@merchant.slug}"
    assert_response :success
    assert_inertia_props page_state: 5
    assert_inertia_props do |props|
      by_id = props[:campaigns].index_by { |c| c[:id] }
      assert_equal true, by_id[@org_campaign.id][:enrolled]
      assert_equal false, by_id[@loyalty.id][:enrolled]
    end
  end

  test "state 6 — identified Customer with a pending Visit today surfaces the code" do
    sign_in_as_customer(@customer)
    Visit.create_from_scan!(customer: @customer, merchant: @merchant)

    get "/m/#{@merchant.slug}"
    assert_response :success
    assert_inertia_props page_state: 6
    assert_inertia_props do |props|
      assert_match(/\A\d{6}\z/, props[:visit][:code])
      assert props[:visit][:pending]
    end
  end

  test "state 7 — identified Customer with a confirmed Visit today hides the claim button" do
    sign_in_as_customer(@customer)
    visit = Visit.create_from_scan!(customer: @customer, merchant: @merchant)
    code = visit.stamps.first.code
    @merchant.confirm_stamps(code: code)

    get "/m/#{@merchant.slug}"
    assert_response :success
    assert_inertia_props page_state: 7
    assert_inertia_props do |props|
      refute props[:visit][:pending]
      assert_nil props[:visit][:code]
    end
  end

  private

  # Pre-warm the signed cookie via the existing enrollment flow, then
  # clear the side-effect Enrollment so each test can choose its own
  # initial state.
  def sign_in_as_customer(customer)
    post customer_organization_campaign_enrollment_path(@org_campaign.organization.slug, @org_campaign.slug),
         params: { enrollment: { name: customer.name, phone: customer.phone } }
    Enrollment.where(customer: customer).delete_all
  end
end
