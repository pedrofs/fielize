# frozen_string_literal: true

class Campaign < ApplicationRecord
  include Sluggable
  sluggable from: :name, scope: :organization_id

  STATUSES = %w[draft active ended].freeze

  belongs_to :organization
  belongs_to :merchant, optional: true   # required only for LoyaltyCampaign

  has_many :prizes, -> { order(:position) }, dependent: :destroy
  has_many :stamps, dependent: :destroy
  has_many :redemptions, dependent: :destroy

  validates :name, :slug, :status, presence: true
  validates :slug, uniqueness: { scope: :organization_id }
  validates :status, inclusion: { in: STATUSES }

  scope :draft,  -> { where(status: "draft") }
  scope :active, -> { where(status: "active") }
  scope :ended,  -> { where(status: "ended") }

  def draft?;    status == "draft";    end
  def active?;   status == "active";   end
  def ended?;    status == "ended";    end

  # No `activate!` / `end!` on the base. The OrganizationCampaign lifecycle
  # (draft → active → ended) lives in OrganizationCampaign::Activatable.
  # LoyaltyCampaign uses its own #disable!(reset:) terminator.
end
