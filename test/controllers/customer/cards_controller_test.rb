# frozen_string_literal: true

require "test_helper"

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

  private

  def sign_in_via_enrollment
    post customer_organization_campaign_enrollment_path(
      organizations(:one).slug, campaigns(:pasaporte).slug
    ), params: { enrollment: { name: "Cliente", phone: "(53) 99999-0000" } }
  end
end
