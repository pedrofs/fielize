# frozen_string_literal: true

class Customer::OrganizationsController < Customer::BaseController
  def show
    set_title @organization.name

    organization_campaigns = @organization.organization_campaigns.active_now
                                          .includes(:prizes, :merchants, hero_image_attachment: :blob)
    loyalty_campaigns = @organization.loyalty_campaigns.active_now
                                     .includes(:prizes, :merchant)
    loyalty_by_merchant = loyalty_campaigns.group_by(&:merchant_id)

    merchants_records = @organization.merchants.order(:name).to_a
    merchants = merchants_records.map { |m|
      serialize_merchant(m,
        org_campaigns: organization_campaigns.select { |c| c.merchants.any? { |mm| mm.id == m.id } },
        loyalty: loyalty_by_merchant[m.id]&.first
      )
    }
    mappable = merchants.select { |m| m[:latitude] && m[:longitude] }

    render inertia: "customer/organizations/show", props: {
      organization: serialize_organization(@organization),
      merchants: merchants,
      campaigns: organization_campaigns.map { |c| serialize_org_campaign_card(c) },
      map_center: map_center_for(mappable),
      empty_state: merchants.empty? && organization_campaigns.empty?
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
      secondary_color: organization.secondary_color,
      bio_html: organization.bio.body&.to_html,
      hero_image_url: organization.hero_image.attached? ? rails_blob_path(organization.hero_image, only_path: true) : nil
    }
  end

  def serialize_merchant(merchant, org_campaigns:, loyalty:)
    {
      id: merchant.id,
      name: merchant.name,
      address: merchant.address,
      latitude: merchant.latitude&.to_f,
      longitude: merchant.longitude&.to_f,
      campaigns: [
        *org_campaigns.map { |c| serialize_campaign_link(c, kind: "organization") },
        *(loyalty ? [ serialize_campaign_link(loyalty, kind: "loyalty") ] : [])
      ]
    }
  end

  def serialize_campaign_link(campaign, kind:)
    {
      id: campaign.id,
      slug: campaign.slug,
      name: campaign.name,
      kind: kind,
      url: customer_organization_campaign_path(@organization.slug, campaign.slug)
    }
  end

  def serialize_org_campaign_card(campaign)
    {
      id: campaign.id,
      slug: campaign.slug,
      name: campaign.name,
      hero_image_url: campaign.hero_image.attached? ? rails_blob_path(campaign.hero_image, only_path: true) : nil,
      prize_highlight: campaign.prizes.first&.name,
      url: customer_organization_campaign_path(@organization.slug, campaign.slug)
    }
  end

  def map_center_for(mappable)
    return nil if mappable.empty?

    {
      latitude: mappable.sum { |m| m[:latitude] } / mappable.size,
      longitude: mappable.sum { |m| m[:longitude] } / mappable.size
    }
  end
end
