# frozen_string_literal: true

require "test_helper"
require "inertia_rails/minitest"

class Customer::CardsControllerTest < ActionDispatch::IntegrationTest
  test "index responds 200 for a visitor without a cookie" do
    get "/me"
    assert_response :success
  end

  test "index responds 200 for a recognized visitor with enrollments" do
    sign_in_via_enrollment

    get "/me"
    assert_response :success
  end

  test "index defers the wallet prop so the page can show a skeleton" do
    sign_in_via_enrollment

    get "/me"
    assert_response :success
    assert_inertia_deferred_props :wallet
  end

  test "index responds 200 even when the cookie references a deleted Customer" do
    sign_in_via_enrollment
    Customer.find_by(phone: "+5553999990000")&.destroy

    get "/me"
    assert_response :success
  end

  test "show responds 200 for the current customer's own enrollment" do
    sign_in_via_enrollment
    enrollment = Customer.find_by(phone: "+5553999990000").enrollments.first

    get customer_card_path(enrollment.id)
    assert_response :success
  end

  test "show defers the card prop so the detail can show a skeleton" do
    sign_in_via_enrollment
    enrollment = Customer.find_by(phone: "+5553999990000").enrollments.first

    get customer_card_path(enrollment.id)
    assert_response :success
    assert_inertia_deferred_props :card
  end

  test "show responds 404 for another customer's enrollment" do
    sign_in_via_enrollment
    other = customers(:maria).enrollments.create!(
      campaign: campaigns(:pasaporte), consented_at: Time.current
    )

    get customer_card_path(other.id)
    assert_response :not_found
  end

  test "show responds 404 for a visitor without a cookie" do
    enrollment = customers(:maria).enrollments.create!(
      campaign: campaigns(:pasaporte), consented_at: Time.current
    )

    get customer_card_path(enrollment.id)
    assert_response :not_found
  end

  test "show responds 404 for an unknown enrollment id" do
    sign_in_via_enrollment

    get customer_card_path(SecureRandom.uuid)
    assert_response :not_found
  end

  test "show serializes the merchant landing url for a loyalty card" do
    sign_in_via_enrollment
    customer   = Customer.find_by(phone: "+5553999990000")
    enrollment = campaigns(:cartao_calzados).enroll!(customer: customer)

    get customer_card_path(enrollment.id)
    assert_response :success
    inertia_load_deferred_props
    assert_inertia_props do |props|
      assert_equal "/m/calzados-ricardo", props[:card][:merchant_url]
    end
  end

  test "show serializes the merchant landing url for a single-merchant org campaign" do
    sign_in_via_enrollment
    enrollment = Customer.find_by(phone: "+5553999990000").enrollments.first

    get customer_card_path(enrollment.id)
    assert_response :success
    inertia_load_deferred_props
    assert_inertia_props do |props|
      assert_equal "/m/calzados-ricardo", props[:card][:merchant_url]
    end
  end

  test "show leaves the merchant landing url nil for a multi-merchant org campaign" do
    sign_in_via_enrollment
    second = organizations(:one).merchants.create!(
      name: "Segunda Loja", latitude: -32.0, longitude: -53.0
    )
    campaigns(:pasaporte).campaign_merchants.create!(merchant: second)
    enrollment = Customer.find_by(phone: "+5553999990000").enrollments.first

    get customer_card_path(enrollment.id)
    assert_response :success
    inertia_load_deferred_props
    assert_inertia_props do |props|
      assert_nil props[:card][:merchant_url]
    end
  end

  private

  def sign_in_via_enrollment
    post customer_organization_campaign_enrollment_path(
      organizations(:one).slug, campaigns(:pasaporte).slug
    ), params: { enrollment: { name: "Cliente", phone: "(53) 99999-0000" } }
  end
end
