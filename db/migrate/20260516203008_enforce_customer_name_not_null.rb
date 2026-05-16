class EnforceCustomerNameNotNull < ActiveRecord::Migration[8.2]
  def change
    change_column_null :customers, :name, false
  end
end
