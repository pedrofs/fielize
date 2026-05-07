class CreateOrganizationMemberships < ActiveRecord::Migration[8.2]
  def change
    create_table :organization_memberships, id: :uuid, default: -> { "uuidv7()" } do |t|
      t.references :organization, null: false, foreign_key: true, type: :uuid
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :role, null: false, default: "member"
      t.references :merchant, foreign_key: true, type: :uuid
      t.references :invited_by, foreign_key: { to_table: :users }, type: :uuid

      t.timestamps
    end
    add_index :organization_memberships, [ :user_id, :organization_id ], unique: true
  end
end
