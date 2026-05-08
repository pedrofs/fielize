# frozen_string_literal: true

# Customer-facing controllers live outside the staff-auth gate. They render
# Inertia like the rest of the app, but do not require a logged-in `User`
# and do not share staff props (current_user, current_organization, etc.).
class Customer::BaseController < ApplicationController
  include PageMetadata

  allow_unauthenticated_access

  before_action :set_organization
  before_action :load_current_customer

  inertia_share current_customer: -> { serialize_current_customer }

  private

  def set_organization
    @organization = Organization.find_by!(slug: params[:org_slug])
  end

  def load_current_customer
    @current_customer = Customer.from_cookie(cookie_jar: cookies)
  end

  def serialize_current_customer
    return nil unless @current_customer
    {
      id: @current_customer.id,
      verified: @current_customer.verified?,
      enrolled_campaign_ids: @current_customer.enrollments.pluck(:campaign_id)
    }
  end
end
