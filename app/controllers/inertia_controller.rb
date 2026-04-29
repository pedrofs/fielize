# frozen_string_literal: true

class InertiaController < ApplicationController
  include PageMetadata

  inertia_share currentUser: -> {
    user = clerk.user
    next nil unless user

    {
      id: user.id,
      email: user.primary_email_address_id ? user.email_addresses.find { |e| e.id == user.primary_email_address_id }&.email_address : nil,
      first_name: user.first_name,
      last_name: user.last_name,
      image_url: user.image_url
    }
  }

  inertia_share title: -> { @title }
  inertia_share breadcrumbs: -> { @breadcrumbs || [] }
end
