# frozen_string_literal: true

# The customer's Wallet at `/me` — the PWA `start_url` and the landing tab
# of the bottom toolbar. Renders the visitor's Cards across every Organization,
# bucketed into Para resgatar / Ativas / Encerradas sections.
#
# Visitors with no signed cookie see a friendly placeholder. There is no
# auth gate — the page renders for anyone, the cookie just decides the state.
class Customer::CardsController < Customer::BaseController
  skip_before_action :set_organization

  def index
    set_title "Meus cartões"

    # Deferred so /me paints its shell immediately and the React page can show a
    # wallet skeleton while the (cross-org, N-enrollment) aggregation loads.
    render inertia: "customer/cards/index", props: {
      wallet: InertiaRails.defer { serialize_wallet(@current_customer) }
    }
  end

  # The Card detail, keyed by Enrollment id and scoped to the current Customer.
  # An enrollment that isn't this device's customer's (or no customer at all)
  # is indistinguishable from one that doesn't exist: 404 either way.
  def show
    enrollment = @current_customer&.enrollments&.find_by(id: params[:id])
    raise ActiveRecord::RecordNotFound if enrollment.nil?

    set_title enrollment.campaign.name

    # The 404 and title resolve on the initial request (cheap), but the card's
    # progress math + prizes/merchants/terms load is deferred so the detail
    # screen can paint a skeleton while it resolves.
    render inertia: "customer/cards/show", props: {
      card: InertiaRails.defer { serialize_card_detail(card_for(enrollment)) }
    }
  end

  private

  def card_for(enrollment)
    card = enrollment.campaign.card_for(customer: @current_customer)
    card.enrollment = enrollment
    card
  end

  def serialize_wallet(customer)
    return { recognized: false, sections: empty_sections } unless customer

    sections = Customer::Wallet.new(customer).sections.transform_values do |cards|
      cards.map { |card| serialize_card(card) }
    end

    { recognized: true, sections: sections }
  end

  def empty_sections
    Customer::Wallet::SECTION_ORDER.index_with { [] }
  end

  def serialize_card(card)
    campaign     = card.campaign
    organization = card.organization

    {
      id: card.enrollment.id,
      state: card.state,
      section: card.section,
      campaign_name: campaign.name,
      organization: {
        name: organization.name,
        image_url: organization.image_url
      },
      url: customer_card_path(card.enrollment.id),
      progress: card.progress
    }
  end

  # The detail payload extends the wallet card shape (state + progress, so the
  # same render is reused) with the campaign's prizes, participating merchants,
  # terms, and a link out to the org-branded campaign page.
  def serialize_card_detail(card)
    campaign     = card.campaign
    organization = card.organization
    loyalty      = campaign.is_a?(LoyaltyCampaign)
    merchants    = loyalty ? Array(campaign.merchant) : campaign.merchants.order(:name).to_a
    terms        = campaign.terms.body.presence || organization.terms.body

    {
      id: card.enrollment.id,
      state: card.state,
      section: card.section,
      kind: loyalty ? "loyalty" : "organization",
      campaign_name: campaign.name,
      organization: {
        name: organization.name,
        image_url: organization.image_url,
        slug: organization.slug
      },
      progress: card.progress,
      prizes: campaign.prizes.order(:position).map { |p| { id: p.id, name: p.name, threshold: p.threshold } },
      merchants: merchants.map { |m| { id: m.id, name: m.name, address: m.address } },
      terms_html: terms&.to_html,
      campaign_url: customer_organization_campaign_path(organization.slug, campaign.slug),
      merchant_url: merchant_landing_url_for(merchants)
    }
  end

  # The "Ir para a loja" CTA only makes sense pointing at a single, unambiguous
  # store. Loyalty cards always have exactly one merchant; an org campaign has a
  # store list, so we only link when it has resolved to a single participant —
  # otherwise the merchant list + campaign-page link cover discovery.
  def merchant_landing_url_for(merchants)
    return nil unless merchants.one?

    customer_merchant_path(merchants.first.slug)
  end
end
