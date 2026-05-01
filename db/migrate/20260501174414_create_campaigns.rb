class CreateCampaigns < ActiveRecord::Migration[8.2]
  def change
    create_table :campaigns do |t|
      t.string     :type, null: false
      t.references :organization, null: false, foreign_key: true
      t.references :merchant, foreign_key: true
      t.string     :name, null: false
      t.string     :slug, null: false
      t.string     :status, null: false, default: "draft"
      t.datetime   :starts_at
      t.datetime   :ends_at
      t.datetime   :effective_from_at
      t.boolean    :requires_validation, null: false, default: false
      t.string     :entry_policy
      t.integer    :day_cap
      t.timestamps
    end
    add_index :campaigns, [ :organization_id, :slug ], unique: true
    add_index :campaigns, [ :organization_id, :status ]
  end
end
