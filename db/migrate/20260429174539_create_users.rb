class CreateUsers < ActiveRecord::Migration[8.2]
  def change
    create_table :users, id: :uuid, default: -> { "uuidv7()" } do |t|
      t.string :clerk_id, null: false
      t.string :email
      t.string :first_name
      t.string :last_name
      t.string :image_url
      t.string :organization_clerk_id

      t.timestamps
    end
    add_index :users, :clerk_id, unique: true
    add_index :users, :organization_clerk_id
  end
end
