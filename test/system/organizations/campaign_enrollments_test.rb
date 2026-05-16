# frozen_string_literal: true

require "application_system_test_case"

class Organizations::CampaignEnrollmentsTest < ApplicationSystemTestCase
  setup do
    @org = organizations(:one)
    @campaign = campaigns(:pasaporte)
  end

  test "show page renders the tab bar with counts and Lojistas active" do
    sign_in_as(users(:admin))

    visit organizations_campaign_path(@campaign)

    assert_selector "[data-testid='campaign-tab-bar']"
    assert_selector "[data-testid='campaign-tab-lojistas'][aria-current='page']",
                    text: "Lojistas (#{@campaign.merchants.count})"
    assert_selector "[data-testid='campaign-tab-clientes']",
                    text: "Clientes (#{@campaign.enrollments.count})"
  end

  test "switching to the Clientes tab navigates to the enrollments URL" do
    sign_in_as(users(:admin))

    visit organizations_campaign_path(@campaign)
    find("[data-testid='campaign-tab-clientes']").click

    assert_current_path organizations_campaign_enrollments_path(@campaign), wait: 5
    assert_selector "[data-testid='campaign-tab-clientes'][aria-current='page']"
  end

  test "Clientes tab renders the empty state when no customers are enrolled" do
    sign_in_as(users(:admin))

    empty_campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Sem clientes",
      slug: "sem-clientes",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      status: "draft"
    )

    visit organizations_campaign_enrollments_path(empty_campaign)

    assert_no_selector "[data-testid='enrollments-table']"
    assert_selector "[data-testid='enrollments-empty']", text: "Ninguém se inscreveu ainda."
  end

  test "Clientes tab renders enrolled customers ordered by confirmed stamps DESC" do
    sign_in_as(users(:admin))

    campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Clientes List",
      slug: "clientes-list",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      status: "draft"
    )
    campaign.prizes.create!(name: "Prêmio", threshold: 3, position: 0)
    CampaignMerchant.create!(organization_campaign: campaign, merchant: merchants(:one))

    busy_customer = Customer.create!(phone: "+5553988880101", name: "Busy Customer",
                                     lgpd_opted_in_at: Time.current)
    quiet_customer = Customer.create!(phone: "+5553988880102", name: "Quiet Customer",
                                      lgpd_opted_in_at: Time.current)
    Enrollment.create!(customer: busy_customer,  campaign: campaign, consented_at: 2.days.ago)
    Enrollment.create!(customer: quiet_customer, campaign: campaign, consented_at: 1.day.ago)

    2.times do |i|
      v = Visit.create!(customer: busy_customer, merchant: merchants(:one), local_day: Date.current - i)
      Stamp.create!(visit: v, campaign: campaign, customer: busy_customer,
                    merchant: merchants(:one), status: "confirmed", confirmed_at: Time.current)
    end

    visit organizations_campaign_enrollments_path(campaign)

    assert_selector "[data-testid='enrollments-table']"
    rows = all("[data-testid^='enrollment-row-']")
    assert_equal 2, rows.size
    assert_equal "enrollment-row-#{busy_customer.id}", rows.first["data-testid"]
    assert_equal "enrollment-row-#{quiet_customer.id}", rows.last["data-testid"]

    within "[data-testid='enrollment-row-#{busy_customer.id}']" do
      assert_text "Busy Customer"
      # phone_masked subline format: "+55 ** *****-0101"
      assert_text "+55 ** *****-0101"
    end
  end

  test "Clientes tab paginates with controls when there are more than the page limit" do
    sign_in_as(users(:admin))

    campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Clientes Pagination",
      slug: "clientes-pagination",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      status: "draft"
    )
    campaign.prizes.create!(name: "Prêmio", threshold: 3, position: 0)

    26.times do |i|
      Enrollment.create!(
        customer: Customer.create!(phone: "+555399999#{format('%04d', i)}",
                                   name: "Customer #{i}",
                                   lgpd_opted_in_at: Time.current),
        campaign: campaign,
        consented_at: (i + 1).hours.ago
      )
    end

    visit organizations_campaign_enrollments_path(campaign)

    assert_selector "[data-testid='enrollments-pagination']"
    rows = all("[data-testid^='enrollment-row-']")
    assert_equal 25, rows.size

    find("[data-testid='enrollments-pagination-next']").click

    rows = all("[data-testid^='enrollment-row-']", wait: 5)
    assert_equal 1, rows.size
  end
end
