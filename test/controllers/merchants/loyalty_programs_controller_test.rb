# frozen_string_literal: true

require "test_helper"
require "inertia_rails/minitest"

# The "Cartão Fidelidade" dashboard's lifecycle branches: the draft branch
# renders the preview Card (earlier slices), the active branch serializes the
# `standings` prop (Slice 3 — the "Pode resgatar agora" / "Quase lá" lists).
class Merchants::LoyaltyProgramsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user     = users(:merchant_staff)
    @merchant = merchants(:one)
    @loyalty  = campaigns(:cartao_calzados) # active, cheapest Prize threshold 5
    @loyalty.stamps.destroy_all             # start each test from a clean era
    sign_in_as(@user)
  end

  test "active branch serializes standings: redeemable + near_reward buckets" do
    redeemable = customer("Redeemable")
    near       = customer("Near")
    stamp(redeemable, 6) # balance 6 ≥ 5 → redeemable
    stamp(near, 4)       # balance 4, missing 1 → near (within 2)

    get merchants_loyalty_program_path
    assert_response :success

    assert_inertia_props do |props|
      standings = props[:standings]
      assert_not_nil standings, "active branch must pass standings"
      assert_equal [ redeemable.id ], standings[:redeemable].map { |r| r[:customer_id] }
      assert_equal 6, standings[:redeemable].first[:balance]
      assert_equal [ near.id ], standings[:near_reward].map { |r| r[:customer_id] }
      assert_equal 1, standings[:near_reward].first[:missing]
      assert_equal 5, standings[:cheapest_threshold]
    end
  end

  test "each standing row carries the Customer name, falling back to masked phone" do
    named   = customer("Named") # has a name
    unnamed = customer("Unnamed")
    unnamed.update_column(:name, "") # legacy blank name → masked-phone fallback
    stamp(named, 6)
    stamp(unnamed, 6)

    get merchants_loyalty_program_path
    assert_inertia_props do |props|
      by_id = props[:standings][:redeemable].index_by { |r| r[:customer_id] }
      assert_equal named.name, by_id[named.id][:customer_name]
      assert_equal unnamed.phone_masked, by_id[unnamed.id][:customer_name]
    end
  end

  test "active program with no Stamps yields empty buckets, not an error" do
    get merchants_loyalty_program_path
    assert_response :success
    assert_inertia_props do |props|
      assert_equal [], props[:standings][:redeemable]
      assert_equal [], props[:standings][:near_reward]
    end
  end

  test "draft branch does not serialize standings (preview only)" do
    @loyalty.update!(status: "draft")

    get merchants_loyalty_program_path
    assert_response :success
    assert_inertia_props do |props|
      assert_nil props[:standings]
      assert_not_nil props[:preview_card]
    end
  end

  private

  def customer(label)
    @seq = (@seq || 0) + 1
    Customer.create!(
      name: "Cust #{label}",
      phone: format("+555398887%04d", @seq),
      lgpd_opted_in_at: Time.current
    )
  end

  def stamp(customer, count)
    count.times do |i|
      visit = Visit.create!(customer: customer, merchant: @merchant, local_day: Date.current - i)
      Stamp.create!(
        visit: visit, campaign: @loyalty, customer: customer, merchant: @merchant,
        status: "confirmed", confirmed_at: Time.current
      )
    end
  end
end
