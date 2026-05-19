class GeneraliseRedemptionsForRaffle < ActiveRecord::Migration[8.2]
  def change
    rename_column :redemptions, :merchant_user_id, :redeemed_by_user_id

    add_reference :redemptions, :raffle, type: :uuid, foreign_key: true, null: true

    change_column_null :redemptions, :threshold_snapshot, true
  end
end
