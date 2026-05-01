# frozen_string_literal: true

namespace :db do
  desc "Backfill organizations.slug and merchants.slug from name. Idempotent."
  task backfill_slugs: :environment do
    backfilled = 0

    Organization.where(slug: [ nil, "" ]).find_each do |org|
      candidate = derive_slug(org.name.presence || "org-#{org.id}",
                              uniqueness_scope: Organization.all)
      org.update_columns(slug: candidate, updated_at: Time.current)
      puts "  organizations[#{org.id}] => #{candidate}"
      backfilled += 1
    end

    Merchant.where(slug: [ nil, "" ]).find_each do |m|
      candidate = derive_slug(m.name.presence || "merchant-#{m.id}",
                              uniqueness_scope: Merchant.where(organization_id: m.organization_id))
      m.update_columns(slug: candidate, updated_at: Time.current)
      puts "  merchants[#{m.id}] => #{candidate}"
      backfilled += 1
    end

    puts "Backfilled #{backfilled} row(s)."
  end

  def derive_slug(source, uniqueness_scope:)
    base = source.to_s.parameterize
    candidate = base
    n = 2
    while uniqueness_scope.where(slug: candidate).exists?
      candidate = "#{base}-#{n}"
      n += 1
    end
    candidate
  end
end
