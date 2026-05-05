# frozen_string_literal: true

class Merchants::CampaignsController < Merchants::BaseController
  with_title "Campanhas"
  with_breadcrumb label: "Campanhas",
                  path: -> { merchants_campaigns_path }

  def index
    campaigns = current_merchant.organization_campaigns.order(starts_at: :desc)

    render inertia: {
      campaigns: campaigns.map { |c| serialize(c) }
    }
  end

  private

  def serialize(campaign)
    {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      status: campaign.status,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      stamps_issued_here: campaign.stamps.confirmed.where(merchant: current_merchant).count
    }
  end
end
