require "test_helper"

class OrganizationTest < ActiveSupport::TestCase
  test "name is not required" do
    org = Organization.new
    assert org.valid?
  end

  test "slug is auto-generated from name and unique" do
    org = Organization.create!(name: "Test Org")
    assert_equal "test-org", org.slug

    duplicate = Organization.create!(name: "Test Org")
    refute_equal "test-org", duplicate.slug
  end

  test "destroying an organization cascades to merchants and campaigns" do
    org = Organization.create!(name: "Destroy A")
    merchant = org.merchants.create!(name: "M")
    campaign = org.organization_campaigns.create!(
      name: "Camp", starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "simple"
    )

    assert_difference -> { Merchant.count }, -1 do
      assert_difference -> { Campaign.count }, -1 do
        org.destroy
      end
    end

    refute Merchant.exists?(merchant.id)
    refute Campaign.exists?(campaign.id)
  end

  test "loyalty_campaigns association reaches through merchants" do
    org = organizations(:one)
    assert_includes org.loyalty_campaigns, campaigns(:cartao_calzados)
  end
end
