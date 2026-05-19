class CreateRaffles < ActiveRecord::Migration[8.2]
  def change
    create_table :raffles, id: :uuid, default: -> { "uuidv7()" } do |t|
      t.references :prize,           type: :uuid, null: false, foreign_key: true, index: { unique: true }
      t.references :campaign,        type: :uuid, null: false, foreign_key: true
      t.references :winner_customer, type: :uuid, foreign_key: { to_table: :customers }
      t.datetime   :drawn_at,        null: false
      t.string     :seed,            null: false
      t.string     :status,          null: false
      t.timestamps
    end
  end
end
