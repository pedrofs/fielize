# frozen_string_literal: true

require "test_helper"

class PwaControllerTest < ActionDispatch::IntegrationTest
  test "manifest is publicly accessible" do
    get "/manifest.json"
    assert_response :success
    assert_equal "application/json", response.media_type
  end

  test "manifest declares /me as the start url and standalone display" do
    get "/manifest.json"
    json = JSON.parse(response.body)

    assert_equal "/me", json["start_url"]
    assert_equal "standalone", json["display"]
    assert json["theme_color"].present?
    assert json["icons"].is_a?(Array)
    assert json["icons"].any?
  end
end
