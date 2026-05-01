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

ActiveRecord::Schema[8.2].define(version: 2026_05_01_174856) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "campaign_merchants", force: :cascade do |t|
    t.bigint "campaign_id", null: false
    t.datetime "created_at", null: false
    t.bigint "merchant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["campaign_id", "merchant_id"], name: "index_campaign_merchants_on_campaign_id_and_merchant_id", unique: true
    t.index ["campaign_id"], name: "index_campaign_merchants_on_campaign_id"
    t.index ["merchant_id"], name: "index_campaign_merchants_on_merchant_id"
  end

  create_table "campaigns", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "day_cap"
    t.datetime "effective_from_at"
    t.datetime "ends_at"
    t.string "entry_policy"
    t.bigint "merchant_id"
    t.string "name", null: false
    t.bigint "organization_id", null: false
    t.boolean "requires_validation", default: false, null: false
    t.string "slug", null: false
    t.datetime "starts_at"
    t.string "status", default: "draft", null: false
    t.string "type", null: false
    t.datetime "updated_at", null: false
    t.index ["merchant_id"], name: "index_campaigns_on_merchant_id"
    t.index ["organization_id", "slug"], name: "index_campaigns_on_organization_id_and_slug", unique: true
    t.index ["organization_id", "status"], name: "index_campaigns_on_organization_id_and_status"
    t.index ["organization_id"], name: "index_campaigns_on_organization_id"
  end

  create_table "customers", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.datetime "lgpd_opted_in_at", null: false
    t.string "name"
    t.string "phone", null: false
    t.datetime "updated_at", null: false
    t.datetime "verified_at"
    t.index ["phone"], name: "index_customers_on_phone", unique: true
  end

  create_table "merchants", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "organization_id", null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id"], name: "index_merchants_on_organization_id"
    t.index ["slug"], name: "index_merchants_on_slug", unique: true
  end

  create_table "organizations", force: :cascade do |t|
    t.string "clerk_organization_id", null: false
    t.datetime "created_at", null: false
    t.string "image_url"
    t.string "name"
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["clerk_organization_id"], name: "index_organizations_on_clerk_organization_id", unique: true
    t.index ["slug"], name: "index_organizations_on_slug", unique: true
  end

  create_table "prizes", force: :cascade do |t|
    t.bigint "campaign_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.integer "position", default: 0, null: false
    t.integer "threshold"
    t.datetime "updated_at", null: false
    t.index ["campaign_id", "position"], name: "index_prizes_on_campaign_id_and_position"
    t.index ["campaign_id"], name: "index_prizes_on_campaign_id"
  end

  create_table "redemptions", force: :cascade do |t|
    t.bigint "campaign_id", null: false
    t.datetime "created_at", null: false
    t.bigint "customer_id", null: false
    t.bigint "merchant_id"
    t.bigint "merchant_user_id"
    t.bigint "prize_id", null: false
    t.integer "threshold_snapshot", null: false
    t.index ["campaign_id"], name: "index_redemptions_on_campaign_id"
    t.index ["customer_id", "campaign_id"], name: "index_redemptions_on_customer_id_and_campaign_id"
    t.index ["customer_id"], name: "index_redemptions_on_customer_id"
    t.index ["merchant_id", "created_at"], name: "index_redemptions_on_merchant_id_and_created_at"
    t.index ["merchant_id"], name: "index_redemptions_on_merchant_id"
    t.index ["merchant_user_id"], name: "index_redemptions_on_merchant_user_id"
    t.index ["prize_id"], name: "index_redemptions_on_prize_id"
  end

  create_table "stamps", force: :cascade do |t|
    t.bigint "campaign_id", null: false
    t.string "code", limit: 6
    t.datetime "confirmed_at"
    t.datetime "created_at", null: false
    t.bigint "customer_id", null: false
    t.datetime "expires_at"
    t.bigint "merchant_id", null: false
    t.string "status", default: "confirmed", null: false
    t.bigint "visit_id", null: false
    t.index ["campaign_id", "status"], name: "index_stamps_on_campaign_id_and_status"
    t.index ["campaign_id"], name: "index_stamps_on_campaign_id"
    t.index ["customer_id", "campaign_id"], name: "index_stamps_on_customer_id_and_campaign_id"
    t.index ["customer_id"], name: "index_stamps_on_customer_id"
    t.index ["merchant_id", "status", "code"], name: "index_stamps_on_merchant_id_and_status_and_code"
    t.index ["merchant_id"], name: "index_stamps_on_merchant_id"
    t.index ["visit_id", "campaign_id"], name: "index_stamps_on_visit_id_and_campaign_id", unique: true
    t.index ["visit_id"], name: "index_stamps_on_visit_id"
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

  create_table "visits", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "customer_id", null: false
    t.bigint "merchant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["customer_id", "merchant_id"], name: "index_visits_on_customer_id_and_merchant_id"
    t.index ["customer_id"], name: "index_visits_on_customer_id"
    t.index ["merchant_id", "created_at"], name: "index_visits_on_merchant_id_and_created_at"
    t.index ["merchant_id"], name: "index_visits_on_merchant_id"
  end

  add_foreign_key "campaign_merchants", "campaigns"
  add_foreign_key "campaign_merchants", "merchants"
  add_foreign_key "campaigns", "merchants"
  add_foreign_key "campaigns", "organizations"
  add_foreign_key "merchants", "organizations"
  add_foreign_key "prizes", "campaigns"
  add_foreign_key "redemptions", "campaigns"
  add_foreign_key "redemptions", "customers"
  add_foreign_key "redemptions", "merchants"
  add_foreign_key "redemptions", "prizes"
  add_foreign_key "redemptions", "users", column: "merchant_user_id"
  add_foreign_key "stamps", "campaigns"
  add_foreign_key "stamps", "customers"
  add_foreign_key "stamps", "merchants"
  add_foreign_key "stamps", "visits"
  add_foreign_key "users", "merchants"
  add_foreign_key "users", "organizations"
  add_foreign_key "visits", "customers"
  add_foreign_key "visits", "merchants"
end
