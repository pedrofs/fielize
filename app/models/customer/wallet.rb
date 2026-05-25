# frozen_string_literal: true

# The customer's Wallet: their Cards aggregated across every Enrollment in
# every Organization, bucketed by `Card#section`. Thin over `Card` — the
# state/section logic lives there; the Wallet only gathers and orders.
#
# Campaigns that don't yet build a Card (e.g. OrganizationCampaign, until a
# later slice) simply contribute nothing — they're filtered out, never an
# error — so a customer enrolled in such a campaign still gets a clean wallet.
class Customer::Wallet
  # Render order of the sections. `para_resgatar` floats to the top so a
  # redemption-ready card is never missed, then `ativas`, then `encerradas`.
  SECTION_ORDER = %w[para_resgatar ativas encerradas].freeze

  def initialize(customer)
    @customer = customer
  end

  # { "para_resgatar" => [Card, ...], "ativas" => [...], "encerradas" => [...] }
  # Always carries all three keys (empty arrays when a section has no cards).
  def sections
    grouped = cards.group_by(&:section)
    SECTION_ORDER.index_with { |section| grouped.fetch(section, []) }
  end

  def cards
    @cards ||= enrollments.filter_map do |enrollment|
      campaign = enrollment.campaign
      next unless campaign.respond_to?(:card_for)

      card = campaign.card_for(customer: @customer)
      card.enrollment = enrollment
      card
    end
  end

  private

  def enrollments
    return Enrollment.none unless @customer

    @customer.enrollments.includes(campaign: :organization).order(:created_at)
  end
end
