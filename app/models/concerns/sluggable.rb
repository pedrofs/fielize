# frozen_string_literal: true

module Sluggable
  extend ActiveSupport::Concern

  class_methods do
    # Usage:
    #   sluggable from: :name                  # global uniqueness
    #   sluggable from: :name, scope: :organization_id
    def sluggable(from:, scope: nil)
      class_attribute :slug_source_attribute, instance_writer: false
      class_attribute :slug_uniqueness_scope, instance_writer: false
      self.slug_source_attribute = from
      self.slug_uniqueness_scope = scope
      before_validation :assign_slug_if_blank
    end
  end

  private

  def assign_slug_if_blank
    return if slug.present?
    return unless self.class.slug_source_attribute

    source = public_send(self.class.slug_source_attribute)
    return if source.blank?

    base = source.to_s.parameterize
    candidate = base
    n = 2
    while slug_taken?(candidate)
      candidate = "#{base}-#{n}"
      n += 1
    end
    self.slug = candidate
  end

  def slug_taken?(candidate)
    rel = self.class.where(slug: candidate)
    if self.class.slug_uniqueness_scope
      rel = rel.where(self.class.slug_uniqueness_scope => public_send(self.class.slug_uniqueness_scope))
    end
    rel = rel.where.not(id: id) if persisted?
    rel.exists?
  end
end
