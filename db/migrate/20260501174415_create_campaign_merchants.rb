class CreateCampaignMerchants < ActiveRecord::Migration[8.2]
  def change
    create_table :campaign_merchants, id: :uuid, default: -> { "uuidv7()" } do |t|
      t.references :campaign, type: :uuid, null: false, foreign_key: true
      t.references :merchant, type: :uuid, null: false, foreign_key: true
      t.timestamps
    end
    add_index :campaign_merchants, [ :campaign_id, :merchant_id ], unique: true
  end
end
