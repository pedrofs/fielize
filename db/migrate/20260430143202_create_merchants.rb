class CreateMerchants < ActiveRecord::Migration[8.2]
  def change
    create_table :merchants do |t|
      t.string :name, null: false
      t.references :organization, null: false, foreign_key: true

      t.timestamps
    end
  end
end
