class CreateStamps < ActiveRecord::Migration[8.2]
  def change
    create_table :stamps, id: :uuid, default: -> { "uuidv7()" } do |t|
      t.references :visit,    type: :uuid, null: false, foreign_key: true
      t.references :campaign, type: :uuid, null: false, foreign_key: true
      t.references :customer, type: :uuid, null: false, foreign_key: true
      t.references :merchant, type: :uuid, null: false, foreign_key: true
      t.string   :status, null: false, default: "confirmed"
      t.string   :code, limit: 6
      t.datetime :expires_at
      t.datetime :confirmed_at
      t.datetime :created_at, null: false
    end
    add_index :stamps, [ :visit_id, :campaign_id ], unique: true
    add_index :stamps, [ :campaign_id, :status ]
    add_index :stamps, [ :customer_id, :campaign_id ]
    add_index :stamps, [ :merchant_id, :status, :code ]
  end
end
