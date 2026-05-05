class HomeController < InertiaController
  allow_unauthenticated_access only: %i[index]

  with_title "Início"
  with_breadcrumb label: "Início", path: -> { root_path }

  def index
    return redirect_to new_session_path unless authenticated?

    if current_merchant
      render_merchant_dashboard
    elsif current_organization
      render_organization_dashboard
    else
      render inertia: {}
    end
  end

  private

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
