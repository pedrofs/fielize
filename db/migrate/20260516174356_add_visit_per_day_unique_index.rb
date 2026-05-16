# frozen_string_literal: true

# DB-level enforcement of "one Visit per (Customer, Merchant) per calendar
# day in BRT." Stored as a plain `local_day` date column populated by the
# Visit model from `created_at` interpreted in `America/Sao_Paulo`. A
# functional index on `(created_at AT TIME ZONE 'America/Sao_Paulo')::date`
# would be ideal but Postgres 18 refuses it: the `AT TIME ZONE` operator
# is STABLE (timezone rules can change), and PG18 propagates the inner
# volatility through SQL/plpgsql wrappers even when they're declared
# IMMUTABLE. A stored column dodges the whole question — the value is
# computed once at insert time and stored, and an ordinary unique index
# enforces the rule.
class AddVisitPerDayUniqueIndex < ActiveRecord::Migration[8.1]
  def up
    add_column :visits, :local_day, :date

    execute <<~SQL
      UPDATE visits
         SET local_day = (created_at AT TIME ZONE 'America/Sao_Paulo')::date
       WHERE local_day IS NULL
    SQL

    change_column_null :visits, :local_day, false

    add_index :visits,
              [ :customer_id, :merchant_id, :local_day ],
              unique: true,
              name: "index_visits_on_customer_merchant_local_day"
  end

  def down
    remove_index :visits, name: "index_visits_on_customer_merchant_local_day"
    remove_column :visits, :local_day
  end
end
