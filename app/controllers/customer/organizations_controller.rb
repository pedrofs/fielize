# frozen_string_literal: true

class Customer::OrganizationsController < Customer::BaseController
  def show
    set_title @organization.name

    merchants = @organization.merchants.order(:name).map { |m| serialize_merchant(m) }
    has_active_campaigns = @organization.campaigns.active.exists?

    render inertia: "customer/organizations/show", props: {
      organization: serialize_organization(@organization),
      merchants: merchants,
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
      address: merchant.address
    }
  end
end
