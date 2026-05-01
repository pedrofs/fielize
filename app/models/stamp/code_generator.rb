# frozen_string_literal: true

class Stamp
  module CodeGenerator
    CODE_TTL = 10.minutes

    module_function

    # Returns a 6-digit string that is not currently in use as a pending,
    # unexpired code at the given merchant.
    def call(merchant_id:, now: Time.current)
      loop do
        candidate = SecureRandom.random_number(1_000_000).to_s.rjust(6, "0")
        taken = Stamp.pending
                     .where(merchant_id: merchant_id, code: candidate)
                     .where("expires_at > ?", now)
                     .exists?
        return candidate unless taken
      end
    end
  end
end
