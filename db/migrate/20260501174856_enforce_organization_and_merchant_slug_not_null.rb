class EnforceOrganizationAndMerchantSlugNotNull < ActiveRecord::Migration[8.2]
  def up
    # Defensive: if any nulls slipped through (e.g. an admin created an
    # org via Clerk webhook between deploy and backfill), fix them now.
    safety_backfill_organizations
    safety_backfill_merchants

    change_column_null :organizations, :slug, false
    change_column_null :merchants,     :slug, false

    # Promote the partial unique index from 5.1 to a full unique index.
    remove_index :organizations, name: "index_organizations_on_slug"
    remove_index :merchants,     name: "index_merchants_on_slug"
    add_index    :organizations, :slug, unique: true
    add_index    :merchants,     :slug, unique: true
  end

  def down
    change_column_null :organizations, :slug, true
    change_column_null :merchants,     :slug, true
    remove_index :organizations, name: "index_organizations_on_slug"
    remove_index :merchants,     name: "index_merchants_on_slug"
    add_index    :organizations, :slug, unique: true, where: "slug IS NOT NULL"
    add_index    :merchants,     :slug, unique: true, where: "slug IS NOT NULL"
  end

  private

  def safety_backfill_organizations
    execute(<<~SQL)
      UPDATE organizations
         SET slug = lower(regexp_replace(coalesce(name, 'org-' || id::text),
                                          '[^a-zA-Z0-9]+', '-', 'g'))
       WHERE slug IS NULL OR slug = ''
    SQL
  end

  def safety_backfill_merchants
    execute(<<~SQL)
      UPDATE merchants
         SET slug = lower(regexp_replace(coalesce(name, 'merchant-' || id::text),
                                          '[^a-zA-Z0-9]+', '-', 'g'))
       WHERE slug IS NULL OR slug = ''
    SQL
  end
end
