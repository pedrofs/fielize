# frozen_string_literal: true

class Organizations::Campaigns::BaseController < Organizations::BaseController
  before_action :set_campaign

  inertia_share campaign: -> { serialize_campaign_chrome(@campaign) if @campaign }
  inertia_share merchants_count:   -> { @campaign&.merchants&.count }
  inertia_share enrollments_count: -> { @campaign&.enrollments&.count }

  private

  def set_campaign
    @campaign = current_organization.campaigns
                                    .where(type: "OrganizationCampaign")
                                    .find(params[:campaign_id])
  end

  def serialize_campaign_chrome(campaign)
    {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      status: campaign.status,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      entry_policy: campaign.entry_policy,
      day_cap: campaign.day_cap,
      prizes: campaign.prizes.order(:position).map do |p|
        { id: p.id, name: p.name, threshold: p.threshold, position: p.position }
      end
    }
  end
end
