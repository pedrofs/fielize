class CreatePrizes < ActiveRecord::Migration[8.2]
  def change
    create_table :prizes, id: :uuid, default: -> { "uuidv7()" } do |t|
      t.references :campaign, type: :uuid, null: false, foreign_key: true
      t.string  :name, null: false
      t.integer :threshold              # null only for simple-OrganizationCampaign prizes
      t.integer :position, null: false, default: 0
      t.timestamps
    end
    add_index :prizes, [ :campaign_id, :position ]
  end
end
