class User < ApplicationRecord
  validates :clerk_id, presence: true, uniqueness: true
end
