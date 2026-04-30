class Organization < ApplicationRecord
  has_many :users, dependent: :nullify
  has_many :merchants, dependent: :destroy

  validates :clerk_organization_id, presence: true, uniqueness: true
end
