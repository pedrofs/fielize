class CreateRaffleEntries < ActiveRecord::Migration[8.2]
  def change
    create_table :raffle_entries, id: :uuid, default: -> { "uuidv7()" } do |t|
      t.references :raffle,   type: :uuid, null: false, foreign_key: true
      t.references :customer, type: :uuid, null: false, foreign_key: true
      t.timestamps
    end
  end
end
