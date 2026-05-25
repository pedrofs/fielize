# frozen_string_literal: true

# Customer-facing Merchant landing page reached by scanning the printed
# QR sticker at `/m/:slug`. Computes the page-state (see PRD #24) from
# (cookie-identified Customer, today's Visit, matching active Campaigns)
# and serializes the props for the React page.
class Customer::MerchantsController < Customer::BaseController
  skip_before_action :set_organization

  def show
    @merchant = Merchant.find_by!(slug: params[:slug])
    set_title @merchant.name

    today_visit = today_visit_for(@current_customer, @merchant)
    matching_campaigns = @merchant.active_campaigns_now

    render inertia: "customer/merchants/show", props: {
      merchant: serialize_merchant(@merchant),
      organization: serialize_organization(@merchant.organization),
      page_state: page_state(today_visit, matching_campaigns),
      campaigns: serialize_campaigns(matching_campaigns),
      visit: today_visit ? serialize_visit(today_visit) : nil,
      progress: @current_customer ? @merchant.landing_progress_for(customer: @current_customer, campaigns: matching_campaigns) : []
    }
  end

  private

  def today_visit_for(customer, merchant)
    return nil unless customer
    Visit.where(customer: customer, merchant: merchant, local_day: Time.zone.today).first
  end

  # Page-state matrix (see PRD #24 "Page-state matrix"):
  #   2 — Merchant has no active campaigns at all.
  #   3 — Unidentified visitor + matching campaigns. Inline WhatsApp form
  #       POSTs to /m/:slug/visit with a phone param; identify-then-claim
  #       happens atomically in the same request.
  #   4 — Identified, no today's Visit, all matching campaigns enrolled.
  #   5 — Identified, no today's Visit, some matching unenrolled.
  #   6 — Identified, today's Visit pending — show the 6-digit code.
  #   7 — Identified, today's Visit confirmed — show "come back tomorrow".
  def page_state(visit, matching_campaigns)
    return 2 if matching_campaigns.empty?
    return 3 unless @current_customer

    if visit
      visit.stamps.any?(&:pending?) ? 6 : 7
    else
      enrolled_ids = @current_customer.enrollments.pluck(:campaign_id).to_set
      unenrolled = matching_campaigns.reject { |c| enrolled_ids.include?(c.id) }
      unenrolled.empty? ? 4 : 5
    end
  end

  def serialize_merchant(merchant)
    {
      id: merchant.id,
      name: merchant.name,
      slug: merchant.slug,
      address: merchant.address
    }
  end

  def serialize_organization(organization)
    {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      image_url: organization.image_url,
      primary_color: organization.primary_color,
      secondary_color: organization.secondary_color
    }
  end

  def serialize_campaigns(campaigns)
    campaigns.map do |campaign|
      enrolled = @current_customer ?
        @current_customer.enrollments.exists?(campaign_id: campaign.id) :
        false
      {
        id: campaign.id,
        name: campaign.name,
        kind: campaign.is_a?(LoyaltyCampaign) ? "loyalty" : "organization",
        enrolled: enrolled,
        url: customer_organization_campaign_path(campaign.organization.slug, campaign.slug)
      }
    end
  end

  def serialize_visit(visit)
    stamps = visit.stamps.includes(:campaign).to_a
    code = stamps.find(&:pending?)&.code
    {
      id: visit.id,
      pending: stamps.any?(&:pending?),
      code: code,
      stamps: stamps.map { |s|
        { id: s.id, campaign_id: s.campaign_id, campaign_name: s.campaign.name, status: s.status }
      }
    }
  end
end
