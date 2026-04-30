class CreateOrganizations < ActiveRecord::Migration[8.2]
  def change
    create_table :organizations do |t|
      t.string :name
      t.string :clerk_organization_id, null: false
      t.string :image_url
      t.string :slug

      t.timestamps
    end
    add_index :organizations, :clerk_organization_id, unique: true
  end
end
