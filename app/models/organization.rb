class Organization < ApplicationRecord
  HEX_COLOR_REGEX = /\A#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\z/

  include Sluggable
  sluggable from: :name

  has_many :memberships, class_name: "OrganizationMembership", dependent: :destroy
  has_many :users, through: :memberships
  has_many :merchants, dependent: :destroy
  has_many :campaigns, dependent: :destroy
  has_many :organization_campaigns, dependent: :destroy
  has_many :loyalty_campaigns, through: :merchants, source: :loyalty_campaign
  has_many :invitations, dependent: :destroy

  has_rich_text :bio
  has_rich_text :terms
  has_one_attached :hero_image

  validates :primary_color, format: { with: HEX_COLOR_REGEX, message: "must be a hex color (e.g. #1a2b3c)" }, allow_blank: true
  validates :secondary_color, format: { with: HEX_COLOR_REGEX, message: "must be a hex color (e.g. #1a2b3c)" }, allow_blank: true
end
