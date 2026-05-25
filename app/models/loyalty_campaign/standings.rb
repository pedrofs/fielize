# frozen_string_literal: true

# The merchant dashboard's two current-state actionable Customer lists, derived
# from the spend-down balance table — read-only by design (ADR-0006).
#
# Single-model concern under the LoyaltyCampaign namespace (CLAUDE.md: a
# cohesive slice — the standings buckets — kept out of the fat model). It mirrors
# `balance_for` in aggregate: confirmed Stamps earned minus summed redeemed
# thresholds, era-scoped to `effective_from_at` (ADR-0005), so a reset zeroes the
# lists exactly as it zeroes each balance. Pending Stamps never count.
#
#   #redeemable           → Customers whose balance reached the cheapest Prize.
#   #near_reward(within:) → `collecting` Customers within `within` of it.
#
# The buckets are mutually exclusive: a redeemable Customer (even one short of a
# higher tier) is never "near". The balance table is computed once per instance.
module LoyaltyCampaign::Standings
  extend ActiveSupport::Concern

  # One standings row: the Customer, their spend-down balance, and (for the
  # "Quase lá" bucket) how many Stamps short of the cheapest Prize they are.
  Row = Struct.new(:customer, :balance, :missing, keyword_init: true)

  # Customers with `balance >= cheapest threshold`, most balance first. The
  # boundary is inclusive — exactly at the threshold is redeemable.
  def redeemable
    threshold = cheapest_prize_threshold
    return [] if threshold.nil?

    balance_table
      .select { |row| row.balance >= threshold }
      .sort_by { |row| -row.balance }
  end

  # `collecting` Customers within `within` Stamps of the cheapest Prize, nearest
  # first. Inclusive at `within`; excludes the redeemable (missing <= 0).
  def near_reward(within:)
    threshold = cheapest_prize_threshold
    return [] if threshold.nil?

    balance_table
      .filter_map do |row|
        missing = threshold - row.balance
        next unless missing >= 1 && missing <= within
        Row.new(customer: row.customer, balance: row.balance, missing: missing)
      end
      .sort_by(&:missing)
  end

  private

  # The per-Customer spend-down balances for the current era, computed once.
  # Keyed off Customers with >=1 confirmed Stamp in the era (you can't be
  # redeemable or near without having earned); their redeemed thresholds are
  # subtracted. Rows carry no `missing` here — each bucket sets its own.
  def balance_table
    @balance_table ||= begin
      cutoff = effective_from_at || Time.at(0)
      earned = stamps.confirmed.where("stamps.created_at > ?", cutoff).group(:customer_id).count
      spent  = redemptions.where("redemptions.created_at > ?", cutoff).group(:customer_id).sum(:threshold_snapshot)
      customers = Customer.where(id: earned.keys).index_by(&:id)

      earned.map do |customer_id, count|
        Row.new(customer: customers[customer_id], balance: count - spent.fetch(customer_id, 0))
      end
    end
  end

  def cheapest_prize_threshold
    return @cheapest_prize_threshold if defined?(@cheapest_prize_threshold)
    @cheapest_prize_threshold = prizes.minimum(:threshold)
  end
end
