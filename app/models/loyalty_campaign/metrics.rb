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
#   #recent    → { 7 => {...}, 15 => {...}, 30 => {...} } window pulse.
#   #top_prize → the Prize with the most Redemptions in the era, or nil.
class LoyaltyCampaign::Metrics
  # Rolling windows (in days) the recent-activity block toggles between. All three
  # are computed at once so the frontend toggle is pure client-side state.
  WINDOWS = [ 7, 15, 30 ].freeze

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

  # The recent-activity pulse for all three windows in one pass, so the client
  # toggle needs no reload. Each window is `{ active:, new:, returning:, stamps:,
  # redemptions: }`. Era-scoped (ADR-0005); confirmed Stamps only (pending never
  # count); windows overlay *within* the era — a window that opens before the era
  # floor is clamped by it.
  def recent
    now = Time.current
    WINDOWS.index_with { |days| window_counts(now - days.days) }
  end

  # The Prize redeemed most in the era — the "keep or cut" signal. Nil when no
  # Redemptions have happened.
  def top_prize
    prize_id, _count = era(@campaign.redemptions).group(:prize_id).count.max_by { |_id, count| count }
    prize_id && @campaign.prizes.find_by(id: prize_id)
  end

  private

  # Counts for a single rolling window opening at `window_start`. The window is
  # the half-open era slice `[window_start, now]`: in-window uses `created_at >=
  # window_start`, the returning lookback uses `created_at < window_start`, so the
  # boundary is split deterministically (a Stamp exactly at the edge is in-window)
  # and the two slices never overlap. The era floor (`> cutoff`) applies to both.
  def window_counts(window_start)
    in_window = era(@campaign.stamps.confirmed).where("stamps.created_at >= ?", window_start)
    active = in_window.distinct.pluck(:customer_id).to_set
    prior  = era(@campaign.stamps.confirmed).where("stamps.created_at < ?", window_start)
      .distinct.pluck(:customer_id).to_set
    returning = (active & prior).size

    {
      active: active.size,
      new: active.size - returning,
      returning: returning,
      stamps: in_window.count,
      redemptions: era(@campaign.redemptions).where("redemptions.created_at >= ?", window_start).count
    }
  end

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
