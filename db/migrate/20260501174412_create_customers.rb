class CreateCustomers < ActiveRecord::Migration[8.2]
  def change
    create_table :customers do |t|
      t.string   :phone, null: false                  # IS the WhatsApp number
      t.string   :name
      t.string   :email
      t.datetime :lgpd_opted_in_at, null: false
      t.datetime :verified_at
      t.timestamps
    end
    add_index :customers, :phone, unique: true
  end
end
