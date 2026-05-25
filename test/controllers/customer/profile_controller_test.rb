# frozen_string_literal: true

require "test_helper"

class Customer::ProfileControllerTest < ActionDispatch::IntegrationTest
  test "show responds 200 for a visitor without a cookie" do
    get "/me/perfil"
    assert_response :success
  end

  test "show responds 200 for a recognized visitor" do
    sign_in_via_enrollment

    get "/me/perfil"
    assert_response :success
  end

  test "show responds 200 even when the cookie references a deleted Customer" do
    sign_in_via_enrollment
    Customer.find_by(phone: "+5553999990000")&.destroy

    get "/me/perfil"
    assert_response :success
  end

  test "update changes the display name and redirects back to the profile" do
    sign_in_via_enrollment
    customer = Customer.find_by(phone: "+5553999990000")

    patch "/me/perfil", params: { profile: { name: "Novo Nome" } }

    assert_redirected_to "/me/perfil"
    assert_equal "Novo Nome", customer.reload.name
  end

  test "update leaves the phone immutable even when a phone param is supplied" do
    sign_in_via_enrollment
    customer = Customer.find_by(phone: "+5553999990000")

    patch "/me/perfil", params: { profile: { name: "Novo Nome", phone: "+5511000000000" } }

    assert_equal "+5553999990000", customer.reload.phone
  end

  test "update rejects a blank name and keeps the previous value" do
    sign_in_via_enrollment
    customer = Customer.find_by(phone: "+5553999990000")

    patch "/me/perfil", params: { profile: { name: "" } }

    assert_equal "Cliente", customer.reload.name
  end

  test "update is a no-op redirect when there is no cookie at all" do
    patch "/me/perfil", params: { profile: { name: "Novo Nome" } }
    assert_redirected_to "/me/perfil"
  end

  private

  def sign_in_via_enrollment
    post customer_organization_campaign_enrollment_path(
      organizations(:one).slug, campaigns(:pasaporte).slug
    ), params: { enrollment: { name: "Cliente", phone: "(53) 99999-0000" } }
  end
end
