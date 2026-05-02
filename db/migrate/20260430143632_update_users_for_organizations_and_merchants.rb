class UpdateUsersForOrganizationsAndMerchants < ActiveRecord::Migration[8.2]
  def change
    remove_index :users, :organization_clerk_id
    remove_column :users, :organization_clerk_id, :string

    add_reference :users, :organization, type: :uuid, foreign_key: true, null: true
    add_reference :users, :merchant, type: :uuid, foreign_key: true, null: true
  end
end
