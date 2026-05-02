require "test_helper"

class OrganizationCampaignNestedAttrsTest < ActiveSupport::TestCase
  setup do
    @valid_attrs = {
      organization: organizations(:one),
      name: "Nested Test",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative"
    }
  end

  # ----- accepts_nested_attributes_for :prizes -----

  test "creates prizes via nested attributes" do
    campaign = OrganizationCampaign.create!(@valid_attrs.merge(
      prizes_attributes: [
        { name: "iPhone", threshold: 6, position: 0 },
        { name: "Smart TV", threshold: 12, position: 1 }
      ]
    ))
    assert_equal 2, campaign.prizes.count
    assert_equal [ "iPhone", "Smart TV" ], campaign.prizes.order(:position).pluck(:name)
  end

  test "updates prizes via nested attributes with id" do
    campaign = OrganizationCampaign.create!(@valid_attrs.merge(
      prizes_attributes: [ { name: "Old Name", threshold: 6, position: 0 } ]
    ))
    prize_id = campaign.prizes.first.id

    campaign.update!(prizes_attributes: [ { id: prize_id, name: "New Name", threshold: 8 } ])
    assert_equal "New Name", campaign.prizes.first.reload.name
    assert_equal 8, campaign.prizes.first.threshold
  end

  test "destroys prizes via _destroy" do
    campaign = OrganizationCampaign.create!(@valid_attrs.merge(
      prizes_attributes: [ { name: "Doomed", threshold: 6, position: 0 } ]
    ))
    prize_id = campaign.prizes.first.id

    campaign.update!(prizes_attributes: [ { id: prize_id, _destroy: true } ])
    assert_equal 0, campaign.prizes.count
  end

  # ----- null_out_thresholds_for_simple_policy -----

  test "switching to simple nulls out thresholds on save" do
    campaign = OrganizationCampaign.create!(@valid_attrs.merge(
      entry_policy: "cumulative",
      prizes_attributes: [ { name: "iPhone", threshold: 6, position: 0 } ]
    ))
    campaign.update!(entry_policy: "simple")
    assert_nil campaign.prizes.first.reload.threshold
  end

  # ----- prevent_merchant_removal_when_active -----

  test "active campaign rejects merchant removal" do
    campaign = OrganizationCampaign.create!(@valid_attrs.merge(
      prizes_attributes: [ { name: "Tier", threshold: 6, position: 0 } ]
    ))
    campaign.merchants << merchants(:one)
    campaign.merchants << merchants(:two)
    campaign.activate!
    assert campaign.active?

    join = campaign.campaign_merchants.find_by!(merchant: merchants(:two))
    refute join.destroy
    assert join.errors[:base].any? { |e| e.include?("ativa") }
    assert_includes campaign.reload.merchant_ids, merchants(:two).id
  end

  test "active campaign accepts merchant additions" do
    campaign = OrganizationCampaign.create!(@valid_attrs.merge(
      prizes_attributes: [ { name: "Tier", threshold: 6, position: 0 } ]
    ))
    campaign.merchants << merchants(:one)
    campaign.activate!

    new_merchant = current_organization_merchants_create(name: "Newcomer")
    campaign.merchant_ids = [ merchants(:one).id, new_merchant.id ]
    assert campaign.save
    assert_includes campaign.merchant_ids, new_merchant.id
  end

  test "draft campaign allows merchant removal" do
    campaign = OrganizationCampaign.create!(@valid_attrs.merge(
      prizes_attributes: [ { name: "Tier", threshold: 6, position: 0 } ]
    ))
    campaign.merchants << merchants(:one)
    campaign.merchants << merchants(:two)
    assert campaign.draft?

    campaign.merchant_ids = [ merchants(:one).id ]
    assert campaign.save
    assert_equal [ merchants(:one).id ], campaign.merchant_ids
  end

  private

  def current_organization_merchants_create(name:)
    organizations(:one).merchants.create!(name: name)
  end
end
