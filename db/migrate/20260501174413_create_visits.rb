class CreateVisits < ActiveRecord::Migration[8.2]
  def change
    create_table :visits, id: :uuid, default: -> { "uuidv7()" } do |t|
      t.references :customer, type: :uuid, null: false, foreign_key: true
      t.references :merchant, type: :uuid, null: false, foreign_key: true
      t.timestamps
    end
    add_index :visits, [ :merchant_id, :created_at ]
    add_index :visits, [ :customer_id, :merchant_id ]
  end
end
