# frozen_string_literal: true

require "test_helper"

class Customer::Organizations::CampaignsControllerTest < ActionDispatch::IntegrationTest
  test "show responds 200 without authentication for an active campaign" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    get "/o/#{organization.slug}/c/#{campaign.slug}"
    assert_response :success
  end

  test "show 404s for an ended campaign" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    campaign.update!(status: "ended")
    get "/o/#{organization.slug}/c/#{campaign.slug}"
    assert_response :not_found
  end

  test "show 404s for a draft campaign" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    campaign.update!(status: "draft")
    get "/o/#{organization.slug}/c/#{campaign.slug}"
    assert_response :not_found
  end

  test "show 404s when the campaign starts_at is still in the future" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    campaign.update!(starts_at: 1.day.from_now)
    get "/o/#{organization.slug}/c/#{campaign.slug}"
    assert_response :not_found
  end

  test "show 404s when the campaign has already ended by ends_at" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    campaign.update!(starts_at: 1.month.ago, ends_at: 1.day.ago)
    get "/o/#{organization.slug}/c/#{campaign.slug}"
    assert_response :not_found
  end

  test "show resolves a LoyaltyCampaign by slug" do
    organization = organizations(:one)
    campaign = campaigns(:cartao_calzados)
    get "/o/#{organization.slug}/c/#{campaign.slug}"
    assert_response :success
  end
end
