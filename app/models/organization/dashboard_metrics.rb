# frozen_string_literal: true

# Aggregates the staff dashboard counters for an Organization. Lives under
# the Organization namespace because it is the model's read-only metrics
# shape — kept out of Organization itself to keep the model's surface
# focused on persistence and behavior.
class Organization::DashboardMetrics
  WINDOWS = {
    days_7: 7.days,
    days_30: 30.days,
    all_time: nil
  }.freeze

  Metrics = Struct.new(
    :new_enrollments,
    :total_enrolled,
    :visits,
    :stamps_pending,
    :stamps_confirmed,
    :redemptions,
    :per_campaign,
    keyword_init: true
  )

  CampaignMetrics = Struct.new(:campaign, :enrollments, :stamps, :redemptions, keyword_init: true)

  def initialize(organization)
    @organization = organization
  end

  def metrics_for(window:)
    raise ArgumentError, "unknown window #{window.inspect}" unless WINDOWS.key?(window)

    since = since_for(window)

    Metrics.new(
      new_enrollments: enrollments_in_window(since).count,
      total_enrolled: total_enrolled,
      visits: visits_in_window(since).count,
      stamps_pending: stamps_in_window(since, status: "pending").count,
      stamps_confirmed: stamps_in_window(since, status: "confirmed").count,
      redemptions: redemptions_in_window(since).count,
      per_campaign: per_campaign_metrics(since)
    )
  end

  private

  attr_reader :organization

  def since_for(window)
    duration = WINDOWS[window]
    duration ? duration.ago : nil
  end

  def enrollments_in_window(since)
    relation = Enrollment.joins(:campaign).where(campaigns: { organization_id: organization.id })
    since ? relation.where("enrollments.created_at >= ?", since) : relation
  end

  def visits_in_window(since)
    relation = Visit.joins(:merchant).where(merchants: { organization_id: organization.id })
    since ? relation.where("visits.created_at >= ?", since) : relation
  end

  def stamps_in_window(since, status:)
    relation = Stamp.joins(:campaign).where(campaigns: { organization_id: organization.id }, status: status)
    since ? relation.where("stamps.created_at >= ?", since) : relation
  end

  def redemptions_in_window(since)
    relation = Redemption.joins(:campaign).where(campaigns: { organization_id: organization.id })
    since ? relation.where("redemptions.created_at >= ?", since) : relation
  end

  def total_enrolled
    Enrollment.joins(:campaign)
              .where(campaigns: { organization_id: organization.id })
              .distinct
              .count(:customer_id)
  end

  def per_campaign_metrics(since)
    active_campaigns = organization.campaigns.active_now.to_a
    return [] if active_campaigns.empty?

    campaign_ids = active_campaigns.map(&:id)

    enrollments_by_campaign = group_count(Enrollment.where(campaign_id: campaign_ids), since)
    stamps_by_campaign      = group_count(Stamp.where(campaign_id: campaign_ids),      since)
    redemptions_by_campaign = group_count(Redemption.where(campaign_id: campaign_ids), since)

    active_campaigns.map do |campaign|
      CampaignMetrics.new(
        campaign: campaign,
        enrollments: enrollments_by_campaign[campaign.id].to_i,
        stamps: stamps_by_campaign[campaign.id].to_i,
        redemptions: redemptions_by_campaign[campaign.id].to_i
      )
    end
  end

  def group_count(relation, since)
    relation = relation.where(created_at: since..) if since
    relation.group(:campaign_id).count
  end
end
