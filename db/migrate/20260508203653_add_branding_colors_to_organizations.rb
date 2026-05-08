class AddBrandingColorsToOrganizations < ActiveRecord::Migration[8.2]
  def change
    add_column :organizations, :primary_color, :string
    add_column :organizations, :secondary_color, :string
  end
end
