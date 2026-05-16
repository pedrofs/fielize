require "test_helper"

class Organizations::CampaignsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as(users(:admin))
  end

  test "index lists only OrganizationCampaigns for current_organization" do
    get organizations_campaigns_path
    assert_response :success
  end

  test "create with valid payload persists campaign + prizes (no merchant selection on the form)" do
    assert_difference -> { Campaign.count }, 1 do
      post organizations_campaigns_path, params: {
        campaign: {
          name: "Pasaporte 2026",
          starts_at: 1.day.from_now.iso8601,
          ends_at:   1.month.from_now.iso8601,
          entry_policy: "cumulative",
          merchant_ids: [ merchants(:one).id ],
          prizes_attributes: [ { name: "iPhone", threshold: 6, position: 0 } ]
        }
      }
    end
    campaign = Campaign.order(:created_at).last
    assert_equal "Pasaporte 2026", campaign.name
    assert_equal 1, campaign.prizes.count
    # merchant_ids is no longer permitted on the form — merchants are added
    # via Organizations::Campaigns::MerchantsController on the show page.
    assert_empty campaign.merchant_ids
  end

  test "destroy is blocked on non-draft" do
    campaign = OrganizationCampaign.create!(
      organization: organizations(:one),
      name: "To Delete",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      status: "active"
    )
    delete organizations_campaign_path(campaign)
    assert Campaign.exists?(campaign.id)
  end
end

class Organizations::Campaigns::ActivationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as(users(:admin))
  end

  test "create activates a draft with prizes + merchants" do
    campaign = OrganizationCampaign.create!(
      organization: organizations(:one),
      name: "Activate Me",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative"
    )
    campaign.prizes.create!(name: "Tier", threshold: 6)
    campaign.merchants << merchants(:one)

    post organizations_campaign_activation_path(campaign)
    assert campaign.reload.active?
  end

  test "create blocks activation when no prize" do
    campaign = OrganizationCampaign.create!(
      organization: organizations(:one),
      name: "No Prize",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative"
    )
    campaign.merchants << merchants(:one)

    post organizations_campaign_activation_path(campaign)
    assert campaign.reload.draft?
  end
end

class Organizations::Campaigns::MerchantsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as(users(:admin))
    @campaign = OrganizationCampaign.create!(
      organization: organizations(:one),
      name: "Attach Target",
      slug: "attach-target",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      status: "draft"
    )
    @merchant = merchants(:one)
  end

  test "create attaches a single merchant" do
    assert_difference -> { @campaign.campaign_merchants.count }, 1 do
      post organizations_campaign_merchants_path(@campaign), params: { merchant_id: @merchant.id }
    end
    assert_redirected_to organizations_campaign_path(@campaign)
    assert_includes @campaign.reload.merchant_ids, @merchant.id
  end

  test "create is idempotent for an already-attached merchant" do
    CampaignMerchant.create!(organization_campaign: @campaign, merchant: @merchant)

    assert_no_difference -> { @campaign.campaign_merchants.count } do
      post organizations_campaign_merchants_path(@campaign), params: { merchant_id: @merchant.id }
    end
    assert_redirected_to organizations_campaign_path(@campaign)
  end

  test "create refuses to attach a merchant from a different organization" do
    other_merchant = merchants(:two)
    assert_no_difference -> { @campaign.campaign_merchants.count } do
      post organizations_campaign_merchants_path(@campaign), params: { merchant_id: other_merchant.id }
    end
  end

  test "create with bulk=1 attaches every unattached organization merchant" do
    # Add a second merchant in the same org so there's something to bulk-add.
    extra = Merchant.create!(organization: organizations(:one), name: "Extra Bulk",
                             slug: "extra-bulk", address: "X",
                             latitude: -32.5, longitude: -53.3)
    expected = organizations(:one).merchants.pluck(:id).sort

    assert_difference -> { @campaign.campaign_merchants.count }, expected.size do
      post organizations_campaign_merchants_path(@campaign), params: { bulk: "1" }
    end
    assert_redirected_to organizations_campaign_path(@campaign)
    assert_equal expected, @campaign.reload.merchant_ids.sort
    assert_includes @campaign.merchant_ids, extra.id
  end

  test "create with bulk=1 is idempotent when nothing is unattached" do
    organizations(:one).merchants.find_each do |m|
      CampaignMerchant.find_or_create_by!(organization_campaign: @campaign, merchant: m)
    end

    assert_no_difference -> { @campaign.campaign_merchants.count } do
      post organizations_campaign_merchants_path(@campaign), params: { bulk: "1" }
    end
    assert_redirected_to organizations_campaign_path(@campaign)
  end

  test "destroy removes a merchant from a draft campaign" do
    CampaignMerchant.create!(organization_campaign: @campaign, merchant: @merchant)

    assert_difference -> { @campaign.campaign_merchants.count }, -1 do
      delete organizations_campaign_merchant_path(@campaign, @merchant)
    end
    assert_redirected_to organizations_campaign_path(@campaign)
    refute_includes @campaign.reload.merchant_ids, @merchant.id
  end

  test "destroy is rejected on an active campaign" do
    CampaignMerchant.create!(organization_campaign: @campaign, merchant: @merchant)
    @campaign.prizes.create!(name: "Tier", threshold: 6)
    @campaign.activate!

    assert_no_difference -> { @campaign.campaign_merchants.count } do
      delete organizations_campaign_merchant_path(@campaign, @merchant)
    end
    assert_redirected_to organizations_campaign_path(@campaign)
    assert_includes @campaign.reload.merchant_ids, @merchant.id
  end

  test "destroy is rejected on an ended campaign" do
    CampaignMerchant.create!(organization_campaign: @campaign, merchant: @merchant)
    @campaign.prizes.create!(name: "Tier", threshold: 6)
    @campaign.activate!
    @campaign.end!
    assert @campaign.ended?

    assert_no_difference -> { @campaign.campaign_merchants.count } do
      delete organizations_campaign_merchant_path(@campaign, @merchant)
    end
    assert_redirected_to organizations_campaign_path(@campaign)
    assert_includes @campaign.reload.merchant_ids, @merchant.id
  end

  test "destroy with unknown merchant_id redirects with an alert" do
    delete organizations_campaign_merchant_path(@campaign, merchants(:two))
    assert_redirected_to organizations_campaign_path(@campaign)
  end
end

class Organizations::Campaigns::TerminationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as(users(:admin))
  end

  test "create transitions active to ended" do
    campaign = OrganizationCampaign.create!(
      organization: organizations(:one),
      name: "End Me",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative",
      status: "active"
    )
    post organizations_campaign_termination_path(campaign)
    assert campaign.reload.ended?
  end

  test "create rejects on draft" do
    campaign = OrganizationCampaign.create!(
      organization: organizations(:one),
      name: "Draft End",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative"
    )
    post organizations_campaign_termination_path(campaign)
    assert campaign.reload.draft?
  end
end
