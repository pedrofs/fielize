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

ActiveRecord::Schema[8.2].define(version: 2026_05_19_130000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "action_text_rich_texts", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.string "name", null: false
    t.text "body"
    t.string "record_type", null: false
    t.uuid "record_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["record_type", "record_id", "name"], name: "index_action_text_rich_texts_uniqueness", unique: true
  end

  create_table "active_storage_attachments", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.uuid "record_id", null: false
    t.uuid "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.uuid "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "campaign_merchants", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.uuid "campaign_id", null: false
    t.datetime "created_at", null: false
    t.uuid "merchant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["campaign_id", "merchant_id"], name: "index_campaign_merchants_on_campaign_id_and_merchant_id", unique: true
    t.index ["campaign_id"], name: "index_campaign_merchants_on_campaign_id"
    t.index ["merchant_id"], name: "index_campaign_merchants_on_merchant_id"
  end

  create_table "campaigns", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "day_cap"
    t.datetime "effective_from_at"
    t.datetime "ends_at"
    t.string "entry_policy"
    t.uuid "merchant_id"
    t.string "name", null: false
    t.uuid "organization_id", null: false
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

  create_table "customers", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.datetime "lgpd_opted_in_at", null: false
    t.string "name", null: false
    t.string "phone", null: false
    t.datetime "updated_at", null: false
    t.datetime "verified_at"
    t.index ["phone"], name: "index_customers_on_phone", unique: true
  end

  create_table "enrollments", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.uuid "customer_id", null: false
    t.uuid "campaign_id", null: false
    t.datetime "consented_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["campaign_id"], name: "index_enrollments_on_campaign_id"
    t.index ["customer_id", "campaign_id"], name: "index_enrollments_on_customer_id_and_campaign_id", unique: true
    t.index ["customer_id"], name: "index_enrollments_on_customer_id"
  end

  create_table "invitations", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.datetime "accepted_at"
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.datetime "expires_at"
    t.uuid "invited_by_id"
    t.uuid "merchant_id"
    t.uuid "organization_id", null: false
    t.string "role", null: false
    t.string "token", null: false
    t.datetime "updated_at", null: false
    t.index ["invited_by_id"], name: "index_invitations_on_invited_by_id"
    t.index ["merchant_id"], name: "index_invitations_on_merchant_id"
    t.index ["organization_id", "email"], name: "idx_invitations_on_org_email_pending", unique: true, where: "(accepted_at IS NULL)"
    t.index ["organization_id"], name: "index_invitations_on_organization_id"
    t.index ["token"], name: "index_invitations_on_token", unique: true
  end

  create_table "merchants", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.uuid "organization_id", null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.string "address"
    t.decimal "latitude", precision: 10, scale: 6
    t.decimal "longitude", precision: 10, scale: 6
    t.index ["organization_id"], name: "index_merchants_on_organization_id"
    t.index ["slug"], name: "index_merchants_on_slug", unique: true
  end

  create_table "organization_memberships", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "invited_by_id"
    t.uuid "merchant_id"
    t.uuid "organization_id", null: false
    t.string "role", default: "member", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["invited_by_id"], name: "index_organization_memberships_on_invited_by_id"
    t.index ["merchant_id"], name: "index_organization_memberships_on_merchant_id"
    t.index ["organization_id"], name: "index_organization_memberships_on_organization_id"
    t.index ["user_id", "organization_id"], name: "index_organization_memberships_on_user_id_and_organization_id", unique: true
    t.index ["user_id"], name: "index_organization_memberships_on_user_id"
  end

  create_table "organizations", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "image_url"
    t.string "name"
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.string "primary_color"
    t.string "secondary_color"
    t.index ["slug"], name: "index_organizations_on_slug", unique: true
  end

  create_table "prizes", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.uuid "campaign_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.integer "position", default: 0, null: false
    t.integer "threshold"
    t.datetime "updated_at", null: false
    t.index ["campaign_id", "position"], name: "index_prizes_on_campaign_id_and_position"
    t.index ["campaign_id"], name: "index_prizes_on_campaign_id"
  end

  create_table "raffle_entries", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.uuid "raffle_id", null: false
    t.uuid "customer_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["customer_id"], name: "index_raffle_entries_on_customer_id"
    t.index ["raffle_id"], name: "index_raffle_entries_on_raffle_id"
  end

  create_table "raffles", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.uuid "prize_id", null: false
    t.uuid "campaign_id", null: false
    t.uuid "winner_customer_id"
    t.datetime "drawn_at", null: false
    t.string "seed", null: false
    t.string "status", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["campaign_id"], name: "index_raffles_on_campaign_id"
    t.index ["prize_id"], name: "index_raffles_on_prize_id", unique: true
    t.index ["winner_customer_id"], name: "index_raffles_on_winner_customer_id"
  end

  create_table "redemptions", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.uuid "campaign_id", null: false
    t.datetime "created_at", null: false
    t.uuid "customer_id", null: false
    t.uuid "merchant_id"
    t.uuid "redeemed_by_user_id"
    t.uuid "prize_id", null: false
    t.integer "threshold_snapshot"
    t.uuid "raffle_id"
    t.index ["campaign_id"], name: "index_redemptions_on_campaign_id"
    t.index ["customer_id", "campaign_id"], name: "index_redemptions_on_customer_id_and_campaign_id"
    t.index ["customer_id"], name: "index_redemptions_on_customer_id"
    t.index ["merchant_id", "created_at"], name: "index_redemptions_on_merchant_id_and_created_at"
    t.index ["merchant_id"], name: "index_redemptions_on_merchant_id"
    t.index ["prize_id"], name: "index_redemptions_on_prize_id"
    t.index ["raffle_id"], name: "index_redemptions_on_raffle_id"
    t.index ["redeemed_by_user_id"], name: "index_redemptions_on_redeemed_by_user_id"
  end

  create_table "sessions", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "ip_address"
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.uuid "user_id", null: false
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "stamps", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.uuid "campaign_id", null: false
    t.string "code", limit: 6
    t.datetime "confirmed_at"
    t.datetime "created_at", null: false
    t.uuid "customer_id", null: false
    t.datetime "expires_at"
    t.uuid "merchant_id", null: false
    t.string "status", default: "confirmed", null: false
    t.uuid "visit_id", null: false
    t.index ["campaign_id", "status"], name: "index_stamps_on_campaign_id_and_status"
    t.index ["campaign_id"], name: "index_stamps_on_campaign_id"
    t.index ["customer_id", "campaign_id"], name: "index_stamps_on_customer_id_and_campaign_id"
    t.index ["customer_id"], name: "index_stamps_on_customer_id"
    t.index ["merchant_id", "status", "code"], name: "index_stamps_on_merchant_id_and_status_and_code"
    t.index ["merchant_id"], name: "index_stamps_on_merchant_id"
    t.index ["visit_id", "campaign_id"], name: "index_stamps_on_visit_id_and_campaign_id", unique: true
    t.index ["visit_id"], name: "index_stamps_on_visit_id"
  end

  create_table "users", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "first_name"
    t.string "image_url"
    t.string "last_name"
    t.string "password_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  create_table "visits", id: :uuid, default: -> { "uuidv7()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "customer_id", null: false
    t.uuid "merchant_id", null: false
    t.datetime "updated_at", null: false
    t.date "local_day", null: false
    t.index ["customer_id", "merchant_id", "local_day"], name: "index_visits_on_customer_merchant_local_day", unique: true
    t.index ["customer_id", "merchant_id"], name: "index_visits_on_customer_id_and_merchant_id"
    t.index ["customer_id"], name: "index_visits_on_customer_id"
    t.index ["merchant_id", "created_at"], name: "index_visits_on_merchant_id_and_created_at"
    t.index ["merchant_id"], name: "index_visits_on_merchant_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "campaign_merchants", "campaigns"
  add_foreign_key "campaign_merchants", "merchants"
  add_foreign_key "campaigns", "merchants"
  add_foreign_key "campaigns", "organizations"
  add_foreign_key "enrollments", "campaigns"
  add_foreign_key "enrollments", "customers"
  add_foreign_key "invitations", "merchants"
  add_foreign_key "invitations", "organizations"
  add_foreign_key "invitations", "users", column: "invited_by_id"
  add_foreign_key "merchants", "organizations"
  add_foreign_key "organization_memberships", "merchants"
  add_foreign_key "organization_memberships", "organizations"
  add_foreign_key "organization_memberships", "users"
  add_foreign_key "organization_memberships", "users", column: "invited_by_id"
  add_foreign_key "prizes", "campaigns"
  add_foreign_key "raffle_entries", "customers"
  add_foreign_key "raffle_entries", "raffles"
  add_foreign_key "raffles", "campaigns"
  add_foreign_key "raffles", "customers", column: "winner_customer_id"
  add_foreign_key "raffles", "prizes"
  add_foreign_key "redemptions", "campaigns"
  add_foreign_key "redemptions", "customers"
  add_foreign_key "redemptions", "merchants"
  add_foreign_key "redemptions", "prizes"
  add_foreign_key "redemptions", "raffles"
  add_foreign_key "redemptions", "users", column: "redeemed_by_user_id"
  add_foreign_key "sessions", "users"
  add_foreign_key "stamps", "campaigns"
  add_foreign_key "stamps", "customers"
  add_foreign_key "stamps", "merchants"
  add_foreign_key "stamps", "visits"
  add_foreign_key "visits", "customers"
  add_foreign_key "visits", "merchants"
end
