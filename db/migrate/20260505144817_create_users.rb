class CreateUsers < ActiveRecord::Migration[8.2]
  def up
    remove_foreign_key :redemptions, :users, column: :merchant_user_id if foreign_key_exists?(:redemptions, :users, column: :merchant_user_id)

    drop_table :users, if_exists: true, force: :cascade

    create_table :users, id: :uuid, default: -> { "uuidv7()" } do |t|
      t.string :email, null: false
      t.string :password_digest, null: false
      t.string :first_name
      t.string :last_name
      t.string :image_url

      t.timestamps
    end
    add_index :users, :email, unique: true

    add_foreign_key :redemptions, :users, column: :merchant_user_id
  end

  def down
    drop_table :users
  end
end
