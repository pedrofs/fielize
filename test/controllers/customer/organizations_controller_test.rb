# frozen_string_literal: true

require "test_helper"

class Customer::OrganizationsControllerTest < ActionDispatch::IntegrationTest
  test "show responds 200 without authentication" do
    get "/o/#{organizations(:one).slug}"
    assert_response :success
  end

  test "show 404s for unknown slug" do
    get "/o/does-not-exist"
    assert_response :not_found
  end
end
