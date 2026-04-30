# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.2].define(version: 2026_04_30_143632) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "merchants", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "organization_id", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id"], name: "index_merchants_on_organization_id"
  end

  create_table "organizations", force: :cascade do |t|
    t.string "clerk_organization_id", null: false
    t.datetime "created_at", null: false
    t.string "image_url"
    t.string "name"
    t.string "slug"
    t.datetime "updated_at", null: false
    t.index ["clerk_organization_id"], name: "index_organizations_on_clerk_organization_id", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "clerk_id", null: false
    t.datetime "created_at", null: false
    t.string "email"
    t.string "first_name"
    t.string "image_url"
    t.string "last_name"
    t.bigint "merchant_id"
    t.bigint "organization_id"
    t.datetime "updated_at", null: false
    t.index ["clerk_id"], name: "index_users_on_clerk_id", unique: true
    t.index ["merchant_id"], name: "index_users_on_merchant_id"
    t.index ["organization_id"], name: "index_users_on_organization_id"
  end

  add_foreign_key "merchants", "organizations"
  add_foreign_key "users", "merchants"
  add_foreign_key "users", "organizations"
end
