# frozen_string_literal: true

# Customer-facing personal page at `/me`. Lists the visitor's Enrollments
# grouped by Organization, surfaces verification status, and provides the
# entry points for "resend confirmation" and "forget me on this device".
#
# Visitors with no signed cookie see a friendly placeholder. There is no
# auth gate — the page renders for anyone, the cookie just decides the
# state.
class Customer::ProfileController < Customer::BaseController
  skip_before_action :set_organization

  def show
    set_title "Minhas inscrições"

    render inertia: "customer/profile/show", props: {
      profile: serialize_profile(@current_customer)
    }
  end

  private

  def serialize_profile(customer)
    return { recognized: false, verified: false, organizations: [] } unless customer

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

    {
      recognized: true,
      verified: customer.verified?,
      organizations: organizations
    }
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
