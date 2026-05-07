class UpdateUsersForMemberships < ActiveRecord::Migration[8.2]
  def change
    remove_index :users, :clerk_id, unique: true if index_exists?(:users, :clerk_id)
    remove_column :users, :clerk_id, :string if column_exists?(:users, :clerk_id)
    remove_index :users, :organization_id if index_exists?(:users, :organization_id)
    remove_foreign_key :users, :organizations if foreign_key_exists?(:users, :organizations)
    remove_column :users, :organization_id, :uuid if column_exists?(:users, :organization_id)
    remove_index :users, :merchant_id if index_exists?(:users, :merchant_id)
    remove_foreign_key :users, :merchants if foreign_key_exists?(:users, :merchants)
    remove_column :users, :merchant_id, :uuid if column_exists?(:users, :merchant_id)
  end
end
