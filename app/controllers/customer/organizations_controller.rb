# frozen_string_literal: true

class Customer::OrganizationsController < Customer::BaseController
  def show
    set_title @organization.name

    merchants = @organization.merchants.order(:name).map { |m| serialize_merchant(m) }
    has_active_campaigns = @organization.campaigns.active.exists?
    mappable = merchants.select { |m| m[:latitude] && m[:longitude] }

    render inertia: "customer/organizations/show", props: {
      organization: serialize_organization(@organization),
      merchants: merchants,
      map_center: map_center_for(mappable),
      empty_state: merchants.empty? && !has_active_campaigns
    }
  end

  private

  def serialize_organization(organization)
    {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      image_url: organization.image_url
    }
  end

  def serialize_merchant(merchant)
    {
      id: merchant.id,
      name: merchant.name,
      address: merchant.address,
      latitude: merchant.latitude&.to_f,
      longitude: merchant.longitude&.to_f
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
