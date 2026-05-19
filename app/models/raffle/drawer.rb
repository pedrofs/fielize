# frozen_string_literal: true

# Pure random-draw function. Deterministic given the seed: re-running
# with the same (entries, seed) always yields the same customer_id.
# Stateless and DB-free — the orchestrator owns persistence.
#
# `entries` is an array of customer_ids — for `simple` campaigns one
# entry per "slip in the hat" (a customer with N stamps appears N
# times); for `cumulative` campaigns each eligible customer appears
# once.
class Raffle::Drawer
  def self.call(entries:, seed:)
    return nil if entries.empty?
    # Convert the hex seed string into a stable integer (Ruby's
    # String#hash is process-randomised, so we can't use it for
    # cross-process replay).
    integer_seed = Digest::SHA256.hexdigest(seed.to_s).to_i(16)
    Random.new(integer_seed).rand(entries.length).then { |index| entries[index] }
  end
end
