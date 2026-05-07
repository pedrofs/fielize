class InertiaController < ApplicationController
  include PageMetadata

  inertia_share current_user: -> {
    next nil unless current_user

    {
      id: current_user.id,
      email: current_user.email,
      first_name: current_user.first_name,
      last_name: current_user.last_name,
      image_url: current_user.image_url,
      memberships: current_user.organization_memberships.includes(:organization, :merchant).map do |m|
        {
          organization_id: m.organization_id,
          organization_name: m.organization.name,
          organization_slug: m.organization.slug,
          role: m.role,
          merchant_id: m.merchant_id
        }
      end
    }
  }

  inertia_share current_organization: -> {
    next nil unless current_organization

    {
      id: current_organization.id,
      name: current_organization.name,
      slug: current_organization.slug,
      image_url: current_organization.image_url
    }
  }

  inertia_share current_merchant: -> {
    next nil unless current_merchant

    {
      id: current_merchant.id,
      name: current_merchant.name,
      organization_id: current_merchant.organization_id
    }
  }

  inertia_share title: -> { @title }
  inertia_share breadcrumbs: -> { @breadcrumbs || [] }
end
