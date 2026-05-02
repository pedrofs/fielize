require "test_helper"

class RedemptionTest < ActiveSupport::TestCase
  setup do
    @loyalty_campaign = campaigns(:cartao_calzados)
    @prize    = prizes(:cartao_cafe) # threshold 5
    @customer = customers(:maria)
    @merchant = @loyalty_campaign.merchant
    @valid_attrs = {
      customer: @customer,
      campaign: @loyalty_campaign,
      prize: @prize,
      merchant: @merchant,
      threshold_snapshot: 5
    }
  end

  test "threshold_snapshot is required" do
    redemption = Redemption.new(@valid_attrs.merge(threshold_snapshot: nil))
    refute redemption.valid?
    assert_includes redemption.errors[:threshold_snapshot], "is not a number"
  end

  test "threshold_snapshot must be a positive integer" do
    zero = Redemption.new(@valid_attrs.merge(threshold_snapshot: 0))
    refute zero.valid?
    assert_includes zero.errors[:threshold_snapshot], "must be greater than 0"

    negative = Redemption.new(@valid_attrs.merge(threshold_snapshot: -1))
    refute negative.valid?
    assert_includes negative.errors[:threshold_snapshot], "must be greater than 0"

    fractional = Redemption.new(@valid_attrs.merge(threshold_snapshot: 1.5))
    refute fractional.valid?
    assert_includes fractional.errors[:threshold_snapshot], "must be an integer"
  end

  test "LoyaltyCampaign redemption requires merchant_id" do
    redemption = Redemption.new(@valid_attrs.merge(merchant: nil))
    refute redemption.valid?
    assert_includes redemption.errors[:merchant_id], "is required for LoyaltyCampaign redemption"
  end

  test "LoyaltyCampaign redemption: merchant must match campaign's merchant" do
    redemption = Redemption.new(@valid_attrs.merge(merchant: merchants(:two)))
    refute redemption.valid?
    assert_includes redemption.errors[:merchant_id], "must match campaign's merchant"
  end

  test "merchant_user must belong to the redemption's merchant" do
    other_user = users(:admin) # an Org user, no merchant_id
    redemption = Redemption.new(@valid_attrs.merge(merchant_user: other_user))
    refute redemption.valid?
    assert_includes redemption.errors[:merchant_user], "must belong to the redemption's merchant"
  end

  test "merchant_user matching the merchant is accepted" do
    staff = users(:merchant_staff) # belongs to merchants(:one)
    redemption = Redemption.new(@valid_attrs.merge(merchant_user: staff))
    assert redemption.valid?, redemption.errors.full_messages.inspect
  end

  test "OrganizationCampaign redemption skips loyalty-specific rules" do
    pasaporte = campaigns(:pasaporte)
    pasaporte_prize = prizes(:pasaporte_iphone)
    redemption = Redemption.new(
      customer: @customer,
      campaign: pasaporte,
      prize: pasaporte_prize,
      merchant: nil,                  # not required for org campaigns
      threshold_snapshot: 6
    )
    assert redemption.valid?, redemption.errors.full_messages.inspect
  end

  test "valid LoyaltyCampaign redemption persists" do
    assert_difference -> { Redemption.count }, 1 do
      Redemption.create!(@valid_attrs)
    end
  end
end
