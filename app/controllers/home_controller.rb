# frozen_string_literal: true

class HomeController < InertiaController
  before_action :require_clerk_session!

  with_title "Home"
  with_breadcrumb label: "Home", path: -> { root_path }

  def index
    if current_user&.merchant_id.present?
      render_merchant_dashboard
    elsif current_user&.organization_id.present?
      render_organization_dashboard
    else
      render inertia: {}   # Signed in but unassociated; fallback empty
    end
  end

  private

  # M1 dashboard: today/week visit counts, pending validations, recent activity.
  def render_merchant_dashboard
    today = Time.current.beginning_of_day
    week  = 1.week.ago

    visits        = current_merchant.visits
    pending_count = current_merchant.stamps.pending
                                    .where("expires_at > ?", Time.current)
                                    .distinct.count(:code)

    render inertia: "merchants/home/index", props: {
      stats: {
        visits_today: visits.where("created_at >= ?", today).count,
        visits_week: visits.where("created_at >= ?", week).count,
        pending_validations: pending_count
      },
      recent_activity: visits.includes(:customer)
                             .order(created_at: :desc)
                             .limit(10)
                             .map { |v| serialize_recent_merchant_visit(v) }
    }
  end

  # A1 dashboard: high-level org health.
  def render_organization_dashboard
    org = current_organization
    week = 1.week.ago

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

  def serialize_recent_merchant_visit(visit)
    {
      id: visit.id,
      customer_name: visit.customer.name.presence || visit.customer.phone,
      created_at: visit.created_at
    }
  end
end
