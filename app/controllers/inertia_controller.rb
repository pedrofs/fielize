# frozen_string_literal: true

class InertiaController < ApplicationController
  include PageMetadata

  inertia_share current_user: -> {
    next nil unless current_user

    {
      id: current_user.id,
      clerk_id: current_user.clerk_id,
      email: current_user.email,
      first_name: current_user.first_name,
      last_name: current_user.last_name,
      organization_id: current_user.organization_id,
      merchant_id: current_user.merchant_id,
      image_url: current_user.image_url
    }
  }

  inertia_share current_organization: -> {
    next nil unless current_organization

    {
      id: current_organization.id,
      clerk_organization_id: current_organization.clerk_organization_id,
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
