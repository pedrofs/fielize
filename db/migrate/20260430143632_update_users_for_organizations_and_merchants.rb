class UpdateUsersForOrganizationsAndMerchants < ActiveRecord::Migration[8.2]
  def change
    remove_index :users, :organization_clerk_id
    remove_column :users, :organization_clerk_id, :string

    add_reference :users, :organization, foreign_key: true, null: true
    add_reference :users, :merchant, foreign_key: true, null: true
  end
end
