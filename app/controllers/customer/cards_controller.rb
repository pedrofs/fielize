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

    render inertia: "customer/cards/index", props: {
      wallet: serialize_wallet(@current_customer)
    }
  end

  private

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
      id: campaign.id,
      state: card.state,
      section: card.section,
      campaign_name: campaign.name,
      organization: {
        name: organization.name,
        image_url: organization.image_url
      },
      url: customer_organization_campaign_path(organization.slug, campaign.slug),
      progress: card.progress
    }
  end
end
