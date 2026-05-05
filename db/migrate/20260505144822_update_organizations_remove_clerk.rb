class UpdateOrganizationsRemoveClerk < ActiveRecord::Migration[8.2]
  def change
    remove_index :organizations, :clerk_organization_id, unique: true if index_exists?(:organizations, :clerk_organization_id)
    remove_column :organizations, :clerk_organization_id, :string if column_exists?(:organizations, :clerk_organization_id)
  end
end
