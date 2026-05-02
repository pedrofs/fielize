require "test_helper"

class MerchantTest < ActiveSupport::TestCase
  test "name is required" do
    merchant = Merchant.new(organization: organizations(:one))
    refute merchant.valid?
    assert_includes merchant.errors[:name], "can't be blank"
  end

  test "organization is required" do
    merchant = Merchant.new(name: "Solo Shop")
    refute merchant.valid?
    assert_includes merchant.errors[:organization], "must exist"
  end

  test "organization_campaigns reaches through campaign_merchants" do
    merchant = merchants(:one)
    assert_includes merchant.organization_campaigns, campaigns(:pasaporte)
    refute_includes merchant.organization_campaigns, campaigns(:cartao_calzados)
  end

  test "loyalty_campaigns association is via merchant_id" do
    merchant = merchants(:one)
    assert_includes merchant.loyalty_campaigns, campaigns(:cartao_calzados)
  end

  test "destroying a merchant blocks if it has visits (restrict_with_exception)" do
    merchant = merchants(:one) # has fixture visits
    assert_raises(ActiveRecord::DeleteRestrictionError) do
      merchant.destroy
    end
  end
end
