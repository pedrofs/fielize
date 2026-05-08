# frozen_string_literal: true

require "application_system_test_case"

class Organizations::DashboardTest < ApplicationSystemTestCase
  setup do
    @org = organizations(:one)
    @merchant = merchants(:one)
    @customer_old = Customer.create!(phone: "+5553911110000", lgpd_opted_in_at: 60.days.ago)
    @customer_recent = Customer.create!(phone: "+5553911110001", lgpd_opted_in_at: 1.day.ago)

    @campaign = campaigns(:pasaporte)

    Enrollment.create!(
      customer: @customer_old,
      campaign: @campaign,
      consented_at: 60.days.ago,
      created_at: 60.days.ago,
      updated_at: 60.days.ago
    )
    Enrollment.create!(
      customer: @customer_recent,
      campaign: @campaign,
      consented_at: 1.day.ago,
      created_at: 1.day.ago,
      updated_at: 1.day.ago
    )
  end

  test "admin sees aggregate metrics and per-campaign cards, and switching the window updates the numbers" do
    sign_in_as(users(:admin))

    visit "/"

    assert_selector "[data-testid='metric-new-enrollments']", text: "1"
    assert_selector "[data-testid='metric-total-enrolled']", text: "2"
    assert_selector "[data-testid='campaign-card-#{@campaign.slug}']"

    within "[data-testid='campaign-card-#{@campaign.slug}']" do
      assert_text @campaign.name
      assert_text(/cadastros/i)
    end

    select "Desde sempre", from: "dashboard-window"

    assert_selector "[data-testid='metric-new-enrollments']", text: "2", wait: 5
    assert_selector "[data-testid='metric-total-enrolled']", text: "2"
  end
end
