class Merchant < ApplicationRecord
  belongs_to :organization
  has_many :users, dependent: :nullify

  validates :name, presence: true
end
