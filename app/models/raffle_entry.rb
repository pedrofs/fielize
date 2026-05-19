# frozen_string_literal: true

# One literal "slip in the hat" — one Customer's appearance in the
# pool of a single Raffle. Materialised at draw time only by
# OrganizationCampaign#draw!. For simple campaigns a Customer with N
# confirmed stamps in the campaign produces N rows per Prize they're
# eligible for; for cumulative campaigns 1 row per crossed-threshold
# Prize.
class RaffleEntry < ApplicationRecord
  belongs_to :raffle
  belongs_to :customer
end
