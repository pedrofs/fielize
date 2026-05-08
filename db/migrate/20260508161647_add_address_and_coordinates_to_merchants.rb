class AddAddressAndCoordinatesToMerchants < ActiveRecord::Migration[8.2]
  def change
    change_table :merchants do |t|
      t.string  :address
      t.decimal :latitude,  precision: 10, scale: 6
      t.decimal :longitude, precision: 10, scale: 6
    end
  end
end
