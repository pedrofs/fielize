class CreateInvitations < ActiveRecord::Migration[8.2]
  def change
    create_table :invitations, id: :uuid, default: -> { "uuidv7()" } do |t|
      t.references :organization, null: false, foreign_key: true, type: :uuid
      t.string :email, null: false
      t.string :role, null: false
      t.references :merchant, foreign_key: true, type: :uuid
      t.string :token, null: false
      t.datetime :expires_at
      t.datetime :accepted_at
      t.references :invited_by, foreign_key: { to_table: :users }, type: :uuid

      t.timestamps
    end
    add_index :invitations, :token, unique: true
    add_index :invitations, [ :organization_id, :email ], where: "accepted_at IS NULL", unique: true, name: "idx_invitations_on_org_email_pending"
  end
end
