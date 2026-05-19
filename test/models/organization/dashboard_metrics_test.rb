# frozen_string_literal: true

require "test_helper"

class Organization::DashboardMetricsTest < ActiveSupport::TestCase
  setup do
    @org = organizations(:empty)
    @merchant = @org.merchants.create!(name: "Loja Centro", latitude: -32.5, longitude: -53.3)

    @customer_a = Customer.create!(name: "Ana",  phone: "+5553900000010", lgpd_opted_in_at: Time.current)
    @customer_b = Customer.create!(name: "Beto", phone: "+5553900000020", lgpd_opted_in_at: Time.current)
    @customer_c = Customer.create!(name: "Caio", phone: "+5553900000030", lgpd_opted_in_at: Time.current)

    @active_campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Active Campaign",
      starts_at: 1.month.ago,
      ends_at: 1.month.from_now,
      status: "active",
      entry_policy: "simple"
    )
    @active_campaign.merchants << @merchant

    @inactive_campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Draft Campaign",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      status: "draft",
      entry_policy: "simple"
    )
  end

  test "metrics_for raises on unknown window" do
    assert_raises(ArgumentError) do
      Organization::DashboardMetrics.new(@org).metrics_for(window: :nonsense)
    end
  end

  test "all_time aggregates count enrollments, stamps, visits, redemptions across all time" do
    create_enrollment(@customer_a, @active_campaign, at: 90.days.ago)
    create_enrollment(@customer_b, @active_campaign, at: 10.days.ago)
    create_enrollment(@customer_c, @active_campaign, at: 1.day.ago)

    create_visit_with_stamp(@customer_a, @active_campaign, status: "confirmed", at: 90.days.ago)
    create_visit_with_pending_stamp(@customer_b, @active_campaign, at: 10.days.ago)

    create_redemption(@customer_a, @active_campaign, at: 90.days.ago)

    metrics = Organization::DashboardMetrics.new(@org).metrics_for(window: :all_time)

    assert_equal 3, metrics.new_enrollments
    assert_equal 3, metrics.total_enrolled
    assert_equal 2, metrics.visits
    assert_equal 1, metrics.stamps_pending
    assert_equal 1, metrics.stamps_confirmed
    assert_equal 1, metrics.redemptions
  end

  test "days_30 window excludes events older than 30 days" do
    create_enrollment(@customer_a, @active_campaign, at: 60.days.ago)
    create_enrollment(@customer_b, @active_campaign, at: 10.days.ago)
    create_enrollment(@customer_c, @active_campaign, at: 1.day.ago)

    create_visit_with_stamp(@customer_a, @active_campaign, status: "confirmed", at: 60.days.ago)
    create_visit_with_pending_stamp(@customer_b, @active_campaign, at: 10.days.ago)
    create_redemption(@customer_a, @active_campaign, at: 60.days.ago)

    metrics = Organization::DashboardMetrics.new(@org).metrics_for(window: :days_30)

    assert_equal 2, metrics.new_enrollments
    assert_equal 3, metrics.total_enrolled, "total_enrolled is cumulative regardless of window"
    assert_equal 1, metrics.visits
    assert_equal 1, metrics.stamps_pending
    assert_equal 0, metrics.stamps_confirmed
    assert_equal 0, metrics.redemptions
  end

  test "days_7 window excludes events older than 7 days" do
    create_enrollment(@customer_a, @active_campaign, at: 10.days.ago)
    create_enrollment(@customer_b, @active_campaign, at: 1.day.ago)
    create_enrollment(@customer_c, @active_campaign, at: 30.minutes.ago)

    metrics = Organization::DashboardMetrics.new(@org).metrics_for(window: :days_7)

    assert_equal 2, metrics.new_enrollments
    assert_equal 3, metrics.total_enrolled
  end

  test "metrics are scoped to the organization, ignoring data from other orgs" do
    other_org = organizations(:two)
    other_campaign = OrganizationCampaign.create!(
      organization: other_org,
      name: "Other org camp",
      starts_at: 1.month.ago,
      ends_at: 1.month.from_now,
      status: "active",
      entry_policy: "simple"
    )

    create_enrollment(@customer_a, @active_campaign, at: 1.day.ago)
    create_enrollment(@customer_b, other_campaign, at: 1.day.ago)

    metrics = Organization::DashboardMetrics.new(@org).metrics_for(window: :all_time)

    assert_equal 1, metrics.new_enrollments
    assert_equal 1, metrics.total_enrolled
  end

  test "per_campaign rollups give counts for each active campaign in the window" do
    create_enrollment(@customer_a, @active_campaign, at: 1.day.ago)
    create_enrollment(@customer_b, @active_campaign, at: 1.day.ago)

    create_visit_with_stamp(@customer_a, @active_campaign, status: "confirmed", at: 1.day.ago)
    create_redemption(@customer_a, @active_campaign, at: 1.day.ago)

    metrics = Organization::DashboardMetrics.new(@org).metrics_for(window: :days_30)

    assert_equal 1, metrics.per_campaign.size
    row = metrics.per_campaign.first
    assert_equal @active_campaign.id, row.campaign.id
    assert_equal 2, row.enrollments
    assert_equal 1, row.stamps
    assert_equal 1, row.redemptions
  end

  test "per_campaign window scopes counts in the per-campaign rows too" do
    create_enrollment(@customer_a, @active_campaign, at: 60.days.ago)
    create_enrollment(@customer_b, @active_campaign, at: 1.day.ago)

    metrics = Organization::DashboardMetrics.new(@org).metrics_for(window: :days_30)

    row = metrics.per_campaign.first
    assert_equal 1, row.enrollments
  end

  test "per_campaign excludes inactive (draft / ended) campaigns" do
    create_enrollment(@customer_a, @inactive_campaign, at: 1.day.ago)

    metrics = Organization::DashboardMetrics.new(@org).metrics_for(window: :all_time)

    campaign_ids = metrics.per_campaign.map { |r| r.campaign.id }
    assert_includes campaign_ids, @active_campaign.id
    refute_includes campaign_ids, @inactive_campaign.id
  end

  test "per_campaign excludes campaigns whose start/end window does not include now" do
    future_campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Future Campaign",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      status: "active",
      entry_policy: "simple"
    )

    metrics = Organization::DashboardMetrics.new(@org).metrics_for(window: :all_time)

    campaign_ids = metrics.per_campaign.map { |r| r.campaign.id }
    refute_includes campaign_ids, future_campaign.id
  end

  test "zero-data org returns zero counts and empty per_campaign" do
    bare_org = Organization.create!(name: "Bare")

    metrics = Organization::DashboardMetrics.new(bare_org).metrics_for(window: :all_time)

    assert_equal 0, metrics.new_enrollments
    assert_equal 0, metrics.total_enrolled
    assert_equal 0, metrics.visits
    assert_equal 0, metrics.stamps_pending
    assert_equal 0, metrics.stamps_confirmed
    assert_equal 0, metrics.redemptions
    assert_equal [], metrics.per_campaign
  end

  test "total_enrolled counts distinct customers across multiple campaigns" do
    other_active = OrganizationCampaign.create!(
      organization: @org,
      name: "Second Active",
      starts_at: 1.month.ago,
      ends_at: 1.month.from_now,
      status: "active",
      entry_policy: "simple"
    )
    other_active.merchants << @merchant

    create_enrollment(@customer_a, @active_campaign, at: 1.day.ago)
    create_enrollment(@customer_a, other_active, at: 1.day.ago)
    create_enrollment(@customer_b, @active_campaign, at: 1.day.ago)

    metrics = Organization::DashboardMetrics.new(@org).metrics_for(window: :all_time)

    assert_equal 2, metrics.total_enrolled
    assert_equal 3, metrics.new_enrollments
  end

  private

  def create_enrollment(customer, campaign, at:)
    Enrollment.create!(
      customer: customer,
      campaign: campaign,
      consented_at: at,
      created_at: at,
      updated_at: at
    )
  end

  def create_visit_with_stamp(customer, campaign, status:, at:)
    visit = Visit.create!(customer: customer, merchant: @merchant, created_at: at, updated_at: at)
    Stamp.create!(
      visit: visit,
      campaign: campaign,
      customer: customer,
      merchant: @merchant,
      status: status,
      confirmed_at: status == "confirmed" ? at : nil,
      created_at: at
    )
    visit
  end

  def create_visit_with_pending_stamp(customer, campaign, at:)
    visit = Visit.create!(customer: customer, merchant: @merchant, created_at: at, updated_at: at)
    Stamp.create!(
      visit: visit,
      campaign: campaign,
      customer: customer,
      merchant: @merchant,
      status: "pending",
      code: SecureRandom.hex(3),
      expires_at: at + 1.day,
      created_at: at
    )
    visit
  end

  def create_redemption(customer, campaign, at:)
    prize = campaign.prizes.create!(name: "Prize-#{SecureRandom.hex(2)}")
    raffle = Raffle.create!(
      campaign: campaign, prize: prize, winner_customer: customer,
      drawn_at: at, seed: SecureRandom.hex(16), status: "drawn"
    )
    Redemption.create!(
      customer: customer,
      campaign: campaign,
      prize: prize,
      raffle: raffle,
      created_at: at
    )
  end
end
