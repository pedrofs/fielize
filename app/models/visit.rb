# frozen_string_literal: true

class Visit < ApplicationRecord
  belongs_to :customer
  belongs_to :merchant
  has_many   :stamps, dependent: :destroy
end
