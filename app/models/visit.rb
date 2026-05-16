# frozen_string_literal: true

class Visit < ApplicationRecord
  include Scannable

  belongs_to :customer
  belongs_to :merchant
  has_many   :stamps, dependent: :destroy

  before_validation :assign_local_day, on: :create
  validates :local_day, presence: true

  private

  # Computed from Time.zone, which application.rb pins to BRT. Kept in
  # lockstep with the partial unique index that enforces "1 Visit per
  # (Customer, Merchant) per local day."
  def assign_local_day
    self.local_day ||= Time.zone.today
  end
end
