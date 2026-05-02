require "test_helper"

class StampTest < ActiveSupport::TestCase
  setup do
    @visit    = visits(:maria_at_calzados)
    @campaign = campaigns(:pasaporte)
    @customer = @visit.customer
    @merchant = @visit.merchant
  end

  test "confirmed stamp requires confirmed_at and forbids code/expires_at" do
    no_confirmed_at = Stamp.new(
      visit: @visit, campaign: @campaign, customer: @customer, merchant: @merchant,
      status: "confirmed", confirmed_at: nil
    )
    refute no_confirmed_at.valid?
    assert_includes no_confirmed_at.errors[:confirmed_at], "is required when confirmed"

    with_code = Stamp.new(
      visit: @visit, campaign: @campaign, customer: @customer, merchant: @merchant,
      status: "confirmed", confirmed_at: Time.current, code: "123456"
    )
    refute with_code.valid?
    assert_includes with_code.errors[:code], "must be blank when confirmed"
  end

  test "pending stamp requires code and expires_at, forbids confirmed_at" do
    no_code = Stamp.new(
      visit: @visit, campaign: @campaign, customer: @customer, merchant: @merchant,
      status: "pending", code: nil, expires_at: 10.minutes.from_now
    )
    refute no_code.valid?
    assert_includes no_code.errors[:code], "is required when pending"

    no_expires_at = Stamp.new(
      visit: @visit, campaign: @campaign, customer: @customer, merchant: @merchant,
      status: "pending", code: "123456", expires_at: nil
    )
    refute no_expires_at.valid?
    assert_includes no_expires_at.errors[:expires_at], "is required when pending"

    with_confirmed_at = Stamp.new(
      visit: @visit, campaign: @campaign, customer: @customer, merchant: @merchant,
      status: "pending", code: "123456", expires_at: 10.minutes.from_now,
      confirmed_at: Time.current
    )
    refute with_confirmed_at.valid?
    assert_includes with_confirmed_at.errors[:confirmed_at], "must be blank when pending"
  end

  test "merchant_id must match visit's merchant_id" do
    other_merchant = merchants(:two)
    bad = Stamp.new(
      visit: @visit, campaign: @campaign, customer: @customer, merchant: other_merchant,
      status: "confirmed", confirmed_at: Time.current
    )
    refute bad.valid?
    assert_includes bad.errors[:merchant_id], "must match visit's merchant"
  end

  test "(visit_id, campaign_id) is unique" do
    duplicate = Stamp.new(
      visit: @visit, campaign: @campaign, customer: @customer, merchant: @merchant,
      status: "confirmed", confirmed_at: Time.current
    )
    refute duplicate.valid?
    assert_includes duplicate.errors[:visit_id], "has already been taken"
  end

  test "scopes select by status" do
    pending_visit = Visit.create!(customer: @customer, merchant: @merchant)
    Stamp.create!(
      visit: pending_visit, campaign: campaigns(:cartao_calzados),
      customer: @customer, merchant: @merchant,
      status: "pending", code: "111111", expires_at: 10.minutes.from_now
    )
    assert Stamp.pending.exists?(code: "111111")
    refute Stamp.confirmed.exists?(code: "111111")
  end
end
