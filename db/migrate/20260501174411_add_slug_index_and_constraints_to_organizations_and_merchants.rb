class AddSlugIndexAndConstraintsToOrganizationsAndMerchants < ActiveRecord::Migration[8.2]
  def change
    # `organizations.slug` already exists (nullable). Just add the partial
    # unique index. NOT NULL flip happens after backfill in a later migration.
    add_index :organizations, :slug, unique: true, where: "slug IS NOT NULL"

    # `merchants.slug` does NOT exist yet — add it nullable, then index.
    add_column :merchants, :slug, :string
    add_index  :merchants, :slug, unique: true, where: "slug IS NOT NULL"
  end
end
