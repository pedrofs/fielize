# frozen_string_literal: true

# Customer-facing controllers live outside the staff-auth gate. They render
# Inertia like the rest of the app, but do not require a logged-in `User`
# and do not share staff props (current_user, current_organization, etc.).
class Customer::BaseController < ApplicationController
  include PageMetadata

  allow_unauthenticated_access

  before_action :set_organization

  private

  def set_organization
    @organization = Organization.find_by!(slug: params[:org_slug])
  end
end
