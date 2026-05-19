# frozen_string_literal: true

# Builds the entry pool for a single Prize at draw time. Returns an
# array of customer_ids — one element per individual "slip in the
# hat", with repetition representing weight. Encapsulates the
# entry-policy math:
#
#   - cumulative: 1 entry per Customer who crossed this Prize's
#     threshold (distinct confirmed Merchant stamps). Customers in
#     `exclude_customer_ids` are dropped.
#
#   - simple: per Customer, per day, min(stamps_per_day, day_cap) (or
#     stamps_per_day if day_cap is nil). Every Prize in a simple
#     campaign shares the same pool — there's no per-prize tiering.
class Raffle::PoolBuilder
  def self.call(prize:, exclude_customer_ids: [])
    new(prize: prize, exclude_customer_ids: exclude_customer_ids).call
  end

  def initialize(prize:, exclude_customer_ids:)
    @campaign = prize.campaign
    @prize = prize
    @exclude = exclude_customer_ids
  end

  def call
    if @campaign.cumulative?
      cumulative_pool
    else
      simple_pool
    end
  end

  private

  def cumulative_pool
    distinct_merchants_per_customer =
      @campaign.stamps.where(status: "confirmed")
                      .where.not(customer_id: @exclude)
                      .distinct
                      .group(:customer_id)
                      .count(:merchant_id)

    distinct_merchants_per_customer
      .select { |_customer_id, count| count >= @prize.threshold.to_i }
      .keys
  end

  def simple_pool
    stamps_per_customer_day =
      @campaign.stamps.where(status: "confirmed")
                      .where.not(customer_id: @exclude)
                      .group(:customer_id, Arel.sql("DATE(created_at)"))
                      .count

    cap = @campaign.day_cap
    pool = []
    stamps_per_customer_day.each do |(customer_id, _day), count|
      entries = cap ? [ count, cap ].min : count
      entries.times { pool << customer_id }
    end
    pool
  end
end
