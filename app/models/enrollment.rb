# frozen_string_literal: true

class Enrollment < ApplicationRecord
  belongs_to :customer
  belongs_to :campaign

  validates :consented_at, presence: true
  validates :customer_id, uniqueness: { scope: :campaign_id }
end
