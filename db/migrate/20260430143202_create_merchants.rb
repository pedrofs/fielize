class CreateMerchants < ActiveRecord::Migration[8.2]
  def change
    create_table :merchants, id: :uuid, default: -> { "uuidv7()" } do |t|
      t.string :name, null: false
      t.references :organization, type: :uuid, null: false, foreign_key: true

      t.timestamps
    end
  end
end
