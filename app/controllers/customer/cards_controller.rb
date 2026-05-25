# frozen_string_literal: true

# The customer's Wallet at `/me` — the PWA `start_url` and the landing tab
# of the bottom toolbar. For now it lists the visitor's Enrollments grouped
# by Organization; a later slice reshapes these into stamp-card views.
#
# Visitors with no signed cookie see a friendly placeholder. There is no
# auth gate — the page renders for anyone, the cookie just decides the state.
class Customer::CardsController < Customer::BaseController
  skip_before_action :set_organization

  def index
    set_title "Meus cartões"

    render inertia: "customer/cards/index", props: {
      wallet: serialize_wallet(@current_customer)
    }
  end

  private

  def serialize_wallet(customer)
    return { recognized: false, organizations: [] } unless customer

    enrollments = customer.enrollments
                          .includes(campaign: :organization)
                          .order(:created_at)

    grouped = enrollments.group_by { |e| e.campaign.organization }
    organizations = grouped.map do |org, rows|
      {
        id: org.id,
        name: org.name,
        slug: org.slug,
        image_url: org.image_url,
        url: customer_organization_path(org.slug),
        enrollments: rows.map { |e| serialize_enrollment(e) }
      }
    end

    { recognized: true, organizations: organizations }
  end

  def serialize_enrollment(enrollment)
    campaign = enrollment.campaign
    {
      id: enrollment.id,
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      url: customer_organization_campaign_path(campaign.organization.slug, campaign.slug)
    }
  end
end
