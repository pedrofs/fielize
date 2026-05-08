class CreateEnrollments < ActiveRecord::Migration[8.2]
  def change
    create_table :enrollments, id: :uuid, default: -> { "uuidv7()" } do |t|
      t.references :customer, type: :uuid, null: false, foreign_key: true
      t.references :campaign, type: :uuid, null: false, foreign_key: true
      t.datetime :consented_at, null: false

      t.timestamps
    end

    add_index :enrollments, [ :customer_id, :campaign_id ], unique: true
  end
end
