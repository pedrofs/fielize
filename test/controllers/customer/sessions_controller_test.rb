# frozen_string_literal: true

require "test_helper"

class Customer::SessionsControllerTest < ActionDispatch::IntegrationTest
  test "destroy clears the customer cookie and redirects to /me" do
    sign_in_via_enrollment
    assert cookies[Customer::Identifiable::COOKIE_KEY.to_s].present?

    delete "/me/session"
    assert_redirected_to "/me"

    assert cookies[Customer::Identifiable::COOKIE_KEY.to_s].blank?
  end

  test "destroy does not delete the Customer record" do
    sign_in_via_enrollment

    assert_no_difference -> { Customer.count } do
      delete "/me/session"
    end
  end

  test "destroy is a no-op when no cookie is present" do
    delete "/me/session"
    assert_redirected_to "/me"
  end

  private

  def sign_in_via_enrollment
    post customer_organization_campaign_enrollment_path(
      organizations(:one).slug, campaigns(:pasaporte).slug
    ), params: { enrollment: { name: "Cliente", phone: "(53) 99999-1111" } }
  end
end
