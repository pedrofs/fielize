class HomeController < InertiaController
  with_title "Início"
  with_breadcrumb label: "Início", path: -> { root_path }

  def index
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
    pending_count = current_merchant.stamps.valid.distinct.count(:code)

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

  WINDOW_PARAMS = {
    "days_7" => :days_7,
    "days_30" => :days_30,
    "all_time" => :all_time
  }.freeze
  DEFAULT_WINDOW = :days_30

  def render_organization_dashboard
    window = WINDOW_PARAMS[params[:window]] || DEFAULT_WINDOW
    metrics = Organization::DashboardMetrics.new(current_organization).metrics_for(window: window)

    render inertia: "organizations/home/index", props: {
      window: window.to_s,
      metrics: {
        new_enrollments: metrics.new_enrollments,
        total_enrolled: metrics.total_enrolled,
        visits: metrics.visits,
        stamps_pending: metrics.stamps_pending,
        stamps_confirmed: metrics.stamps_confirmed,
        redemptions: metrics.redemptions,
        per_campaign: metrics.per_campaign.map { |row| serialize_per_campaign(row) }
      }
    }
  end

  def serialize_per_campaign(row)
    {
      id: row.campaign.id,
      name: row.campaign.name,
      slug: row.campaign.slug,
      type: row.campaign.type,
      enrollments: row.enrollments,
      stamps: row.stamps,
      redemptions: row.redemptions
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
