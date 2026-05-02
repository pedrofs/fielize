require "test_helper"

class Stamp::CodeGeneratorTest < ActiveSupport::TestCase
  test "generates a 6-digit zero-padded string" do
    code = Stamp::CodeGenerator.call(merchant_id: merchants(:one).id)
    assert_match(/\A\d{6}\z/, code)
  end

  test "avoids active pending codes for the same merchant" do
    merchant = merchants(:one)
    # Reserve a pending stamp at this merchant with a known code.
    visit = Visit.create!(customer: customers(:maria), merchant: merchant)
    Stamp.create!(
      visit: visit,
      campaign: campaigns(:cartao_calzados),
      customer: customers(:maria),
      merchant: merchant,
      status: "pending",
      code: "424242",
      expires_at: 10.minutes.from_now
    )

    # Stub SecureRandom.random_number so the generator first hits the taken
    # code, then settles on a free one.
    sequence = [ 424242, 999999 ]
    fake_random = Object.new
    fake_random.define_singleton_method(:random_number) { |_n| sequence.shift }
    assert_equal "999999", Stamp::CodeGenerator.call(merchant_id: merchant.id, random: fake_random)
  end

  test "ignores expired pending codes (treats them as free)" do
    merchant = merchants(:one)
    visit = Visit.create!(customer: customers(:maria), merchant: merchant)
    Stamp.create!(
      visit: visit,
      campaign: campaigns(:cartao_calzados),
      customer: customers(:maria),
      merchant: merchant,
      status: "pending",
      code: "424242",
      expires_at: 1.hour.ago # already expired
    )

    fake_random = Object.new
    fake_random.define_singleton_method(:random_number) { |_n| 424242 }
    # Expired code is no longer "taken"; generator returns it.
    assert_equal "424242", Stamp::CodeGenerator.call(merchant_id: merchant.id, random: fake_random)
  end

  test "ignores codes at OTHER merchants" do
    visit = Visit.create!(customer: customers(:maria), merchant: merchants(:one))
    Stamp.create!(
      visit: visit,
      campaign: campaigns(:cartao_calzados),
      customer: customers(:maria),
      merchant: merchants(:one),
      status: "pending",
      code: "424242",
      expires_at: 10.minutes.from_now
    )

    fake_random = Object.new
    fake_random.define_singleton_method(:random_number) { |_n| 424242 }
    # Same code at a different merchant is fine.
    assert_equal "424242", Stamp::CodeGenerator.call(merchant_id: merchants(:two).id, random: fake_random)
  end
end
