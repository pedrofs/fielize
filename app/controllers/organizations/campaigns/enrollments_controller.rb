# frozen_string_literal: true

class Organizations::Campaigns::EnrollmentsController < Organizations::Campaigns::BaseController
  with_breadcrumb label: "Campanhas", path: -> { organizations_campaigns_path }

  def index
    set_title @campaign.name
    add_breadcrumb label: @campaign.name, path: organizations_campaign_path(@campaign)
    add_breadcrumb label: "Clientes", path: organizations_campaign_enrollments_path(@campaign)

    pagy, rows = @campaign.enrollment_rows(page: params[:page] || 1, per_page: 25)

    render inertia: {
      enrollment_rows: rows,
      pagination: {
        page:  pagy.page,
        pages: pagy.pages,
        count: pagy.count,
        limit: pagy.limit,
        prev:  pagy.prev,
        next:  pagy.next
      }
    }
  end
end
