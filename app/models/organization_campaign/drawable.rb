# frozen_string_literal: true

# Lifecycle for OrganizationCampaign: the end-of-campaign Raffle. The
# #draw! orchestrator walks Prizes in `position` order, builds the
# eligible pool per Prize, picks a winner via the deterministic
# Drawer, materialises Raffle + RaffleEntry rows, and accumulates
# excluded customers so the same Customer never wins more than one
# Prize in the same Campaign. Flips status `ended → drawn`.
module OrganizationCampaign::Drawable
  extend ActiveSupport::Concern

  # Flip ended → drawn after running the per-Prize Raffles.
  # Returns false (no mutation) if the campaign is not in `ended` or
  # has no prizes configured.
  def draw!
    return false unless ended?
    return false if prizes.empty?

    transaction do
      excluded = []
      prizes.order(:position).each do |prize|
        pool   = Raffle::PoolBuilder.call(
          prize: prize, exclude_customer_ids: excluded
        )
        seed   = SecureRandom.hex(16)
        winner = Raffle::Drawer.call(entries: pool, seed: seed)

        raffle = if winner.nil?
          Raffle.create!(
            prize: prize, campaign: self, drawn_at: Time.current,
            seed: seed, status: "no_winner"
          )
        else
          excluded << winner
          Raffle.create!(
            prize: prize, campaign: self, drawn_at: Time.current,
            seed: seed, status: "drawn", winner_customer_id: winner
          )
        end

        if pool.any?
          rows = pool.map { |customer_id| { raffle_id: raffle.id, customer_id: customer_id } }
          RaffleEntry.insert_all(rows, record_timestamps: true)
        end
      end

      update!(status: "drawn")
    end

    true
  end
end
