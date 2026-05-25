# frozen_string_literal: true

# The active Cartão Fidelidade's cumulative health view — read-only by design
# (ADR-0006), scoped to the current balance era (ADR-0005), consistent with how
# `balance_for` and Standings already cut on `effective_from_at`.
#
# A PORO collaborator of LoyaltyCampaign (reached via `campaign.metrics`); the
# public API stays on the model. Slice 4 (PRD #51) ships the redemption funnel
# and the most-redeemed Prize; Slice 5 extends this with the windowed `#recent`
# block.
#
#   #funnel    → { enrolled:, stamped:, redeemed: } over the era.
#   #top_prize → the Prize with the most Redemptions in the era, or nil.
class LoyaltyCampaign::Metrics
  def initialize(campaign)
    @campaign = campaign
  end

  # Inscritos → Carimbaram → Resgataram, counting distinct Customers (not
  # events) at each stage. Monotonic by construction: each stage is unioned into
  # the one above it, so `enrolled >= stamped >= redeemed` holds even when a
  # returning Customer earns Stamps in a new era against a pre-reset enrollment
  # row (they still count as enrolled). Pending Stamps are excluded.
  def funnel
    redeemed = redeemed_customer_ids
    stamped  = stamped_customer_ids | redeemed
    enrolled = enrolled_customer_ids | stamped

    { enrolled: enrolled.size, stamped: stamped.size, redeemed: redeemed.size }
  end

  # The Prize redeemed most in the era — the "keep or cut" signal. Nil when no
  # Redemptions have happened.
  def top_prize
    prize_id, _count = era(@campaign.redemptions).group(:prize_id).count.max_by { |_id, count| count }
    prize_id && @campaign.prizes.find_by(id: prize_id)
  end

  private

  def enrolled_customer_ids
    era(@campaign.enrollments).distinct.pluck(:customer_id).to_set
  end

  def stamped_customer_ids
    era(@campaign.stamps.confirmed).distinct.pluck(:customer_id).to_set
  end

  def redeemed_customer_ids
    era(@campaign.redemptions).distinct.pluck(:customer_id).to_set
  end

  # Era-scope a relation on its own table's `created_at` (ADR-0005).
  def era(relation)
    relation.where("#{relation.table_name}.created_at > ?", cutoff)
  end

  def cutoff
    @cutoff ||= @campaign.effective_from_at || Time.at(0)
  end
end
