require "test_helper"

class Organizations::CampaignsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as(users(:admin))
  end

  test "index lists only OrganizationCampaigns for current_organization" do
    get organizations_campaigns_path
    assert_response :success
  end

  test "create with valid payload persists campaign + prizes + merchants" do
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
    assert_includes campaign.merchant_ids, merchants(:one).id
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
