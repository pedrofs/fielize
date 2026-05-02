# frozen_string_literal: true

class HomeController < InertiaController
  before_action :require_clerk_session!

  with_title "Home"
  with_breadcrumb label: "Home", path: -> { root_path }

  def index
    if current_user&.organization_id.present?
      render_organization_dashboard
    elsif current_user&.merchant_id.present?
      render inertia: {}   # Merchant-side dashboard ships in 04-impl-merchant
    else
      render inertia: {}   # Signed in but unassociated; fallback empty
    end
  end

  private

  # A1 dashboard: high-level org health.
  def render_organization_dashboard
    org = current_organization
    today = Time.current.beginning_of_day
    week  = 1.week.ago

    render inertia: {
      stats: {
        merchants_count: org.merchants.count,
        active_campaigns_count: org.campaigns.where(type: "OrganizationCampaign", status: "active").count,
        customers_count: Customer.joins(:visits).where(visits: { merchant_id: org.merchants }).distinct.count,
        visits_this_week_count: Visit.where(merchant_id: org.merchants).where("created_at > ?", week).count
      },
      recent_activity: Visit.includes(:customer)
                            .where(merchant_id: org.merchants)
                            .order(created_at: :desc)
                            .limit(20)
                            .map { |v| serialize_recent_visit(v) }
    }
  end

  def serialize_recent_visit(visit)
    {
      id: visit.id,
      customer_name: visit.customer.name.presence || visit.customer.phone,
      merchant_name: visit.merchant.name,
      created_at: visit.created_at
    }
  end
end
