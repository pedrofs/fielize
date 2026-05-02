require "test_helper"

class OrganizationTest < ActiveSupport::TestCase
  test "clerk_organization_id is required" do
    org = Organization.new
    refute org.valid?
    assert_includes org.errors[:clerk_organization_id], "can't be blank"
  end

  test "clerk_organization_id is unique" do
    duplicate = Organization.new(
      clerk_organization_id: organizations(:one).clerk_organization_id,
      name: "Dup"
    )
    refute duplicate.valid?
    assert_includes duplicate.errors[:clerk_organization_id], "has already been taken"
  end

  test "destroying an organization cascades to merchants and campaigns" do
    org = Organization.create!(clerk_organization_id: "org_destroy_a", name: "Destroy A")
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

  test "users are nullified, not destroyed, on organization destroy" do
    org = Organization.create!(clerk_organization_id: "org_destroy_b", name: "Destroy B")
    user = User.create!(clerk_id: "user_destroy_b", organization: org)

    org.destroy
    assert User.exists?(user.id)
    assert_nil user.reload.organization_id
  end

  test "loyalty_campaigns association reaches through merchants" do
    org = organizations(:one)
    assert_includes org.loyalty_campaigns, campaigns(:cartao_calzados)
  end
end
