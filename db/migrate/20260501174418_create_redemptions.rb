class CreateRedemptions < ActiveRecord::Migration[8.2]
  def change
    create_table :redemptions do |t|
      t.references :customer,      null: false, foreign_key: true
      t.references :campaign,      null: false, foreign_key: true
      t.references :prize,         null: false, foreign_key: true
      t.references :merchant,      foreign_key: true
      t.references :merchant_user, foreign_key: { to_table: :users }
      t.integer  :threshold_snapshot, null: false
      t.datetime :created_at, null: false
    end
    add_index :redemptions, [ :customer_id, :campaign_id ]
    add_index :redemptions, [ :merchant_id, :created_at ]
  end
end
