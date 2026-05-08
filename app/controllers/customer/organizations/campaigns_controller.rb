# frozen_string_literal: true

class Customer::Organizations::CampaignsController < Customer::BaseController
  def show
    @campaign = @organization.campaigns.active_now.find_by!(slug: params[:slug])
    set_title @campaign.name

    render inertia: "customer/organizations/campaigns/show", props: {
      organization: serialize_organization(@organization),
      campaign: serialize_campaign(@campaign)
    }
  end

  private

  def serialize_organization(organization)
    {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      image_url: organization.image_url,
      primary_color: organization.primary_color,
      secondary_color: organization.secondary_color
    }
  end

  def serialize_campaign(campaign)
    merchants = campaign.is_a?(LoyaltyCampaign) ? Array(campaign.merchant) : campaign.merchants.to_a
    effective_terms = campaign.terms.body.presence || @organization.terms.body

    {
      id: campaign.id,
      slug: campaign.slug,
      name: campaign.name,
      kind: campaign.is_a?(LoyaltyCampaign) ? "loyalty" : "organization",
      hero_image_url: campaign.hero_image.attached? ? rails_blob_path(campaign.hero_image, only_path: true) : nil,
      description_html: campaign.description.body&.to_html,
      terms_html: effective_terms&.to_html,
      prizes: campaign.prizes.order(:position).map { |p| { id: p.id, name: p.name, threshold: p.threshold, position: p.position } },
      merchants: merchants.map { |m| { id: m.id, name: m.name, address: m.address } }
    }
  end
end
