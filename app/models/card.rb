# frozen_string_literal: true

# A Card is the customer-facing, per-Enrollment view of a Campaign — the
# stamp-card the Wallet renders. It is a value object built by each Campaign
# subtype's `#card_for(customer:)`: the subtype owns the progress math, the
# Card owns the state→section mapping (the single source of truth for which
# Wallet section a card lands in) and carries the kind-specific `progress`
# payload the frontend renders.
class Card
  # state → section. Subtypes only decide `state`; the section follows from
  # it here so the mapping has exactly one home. (Org-campaign states such as
  # awaiting_draw / won / redeemed / lost arrive in later slices.)
  SECTIONS = {
    "collecting"    => "ativas",
    "redeemable"    => "para_resgatar",
    "awaiting_draw" => "ativas",
    "won"           => "para_resgatar",
    "redeemed"      => "encerradas",
    "lost"          => "encerradas",
    "disabled"      => "encerradas"
  }.freeze

  attr_reader :campaign, :customer, :state, :progress

  # The Enrollment this Card belongs to. Set by whoever builds the Card in a
  # Wallet context (`Customer::Wallet`); it's the stable key the detail screen
  # at `/me/cartoes/:id` is addressed by. Nil when a Card is built outside a
  # wallet (e.g. a campaign building a one-off Card for itself).
  attr_accessor :enrollment

  def initialize(campaign:, customer:, state:, progress:)
    @campaign = campaign
    @customer = customer
    @state    = state
    @progress = progress
  end

  def section
    SECTIONS.fetch(state)
  end

  def organization
    campaign.organization
  end
end
