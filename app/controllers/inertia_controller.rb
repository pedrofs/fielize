# frozen_string_literal: true

class InertiaController < ApplicationController
  include PageMetadata

  inertia_share currentUser: -> {
    next nil unless current_user

    {
      id: current_user.id,
      clerk_id: current_user.clerk_id,
      email: current_user.email,
      first_name: current_user.first_name,
      last_name: current_user.last_name,
      image_url: current_user.image_url,
      organization_clerk_id: current_user.organization_clerk_id
    }
  }

  inertia_share title: -> { @title }
  inertia_share breadcrumbs: -> { @breadcrumbs || [] }
end
