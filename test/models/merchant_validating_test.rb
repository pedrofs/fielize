require "test_helper"

class MerchantValidatingTest < ActiveSupport::TestCase
  setup do
    @merchant = merchants(:one)
    @customer = customers(:joao)
    @visit = @merchant.visits.create!(customer: @customer)
  end

  # ---- confirm_stamps ----

  test "confirm_stamps flips all sibling pending stamps with the same code" do
    code = "123456"
    s1 = create_pending_stamp(visit: @visit, campaign: campaigns(:pasaporte), code: code)
    s2 = create_pending_stamp(
      visit: @visit, campaign: organization_campaign_factory(:secondary), code: code
    )

    confirmed = @merchant.confirm_stamps(code: code)

    assert_equal [ s1.id, s2.id ].sort, confirmed.map(&:id).sort
    [ s1, s2 ].each(&:reload)
    assert s1.confirmed?
    assert s2.confirmed?
    assert_nil s1.code
    assert_nil s1.expires_at
  end

  test "confirm_stamps returns [] for unknown code" do
    create_pending_stamp(visit: @visit, campaign: campaigns(:pasaporte), code: "111111")
    assert_equal [], @merchant.confirm_stamps(code: "999999")
  end

  test "confirm_stamps ignores expired stamps" do
    code = "555555"
    expired = create_pending_stamp(
      visit: @visit, campaign: campaigns(:pasaporte), code: code, expires_at: 1.minute.ago
    )

    assert_equal [], @merchant.confirm_stamps(code: code)
    assert expired.reload.pending?
  end

  test "confirm_stamps is scoped to current merchant" do
    code = "424242"
    other_merchant = merchants(:two)
    other_visit = other_merchant.visits.create!(customer: @customer)
    create_pending_stamp(
      visit: other_visit, merchant: other_merchant,
      campaign: campaigns(:pasaporte), code: code
    )

    assert_equal [], @merchant.confirm_stamps(code: code)
  end

  # ---- campaign_progress_for ----

  test "campaign_progress_for returns lines for active campaigns touched in the visit" do
    create_confirmed_stamp(visit: @visit, campaign: campaigns(:pasaporte))
    create_confirmed_stamp(visit: @visit, campaign: campaigns(:cartao_calzados))

    lines = @merchant.campaign_progress_for(customer: @customer, visit: @visit)

    kinds = lines.map { |l| l[:kind] }.sort
    assert_equal %w[loyalty organization], kinds
  end

  test "campaign_progress_for skips non-active campaigns" do
    ended = OrganizationCampaign.create!(
      organization: organizations(:one), name: "Old", slug: "old",
      starts_at: 2.months.ago, ends_at: 1.month.ago, entry_policy: "cumulative",
      status: "ended"
    )
    create_confirmed_stamp(visit: @visit, campaign: ended)

    lines = @merchant.campaign_progress_for(customer: @customer, visit: @visit)
    refute_includes lines.map { |l| l[:id] }, ended.id
  end

  private

  def create_pending_stamp(visit:, campaign:, code:, merchant: @merchant, expires_at: 10.minutes.from_now)
    Stamp.create!(
      visit: visit, campaign: campaign, customer: visit.customer, merchant: merchant,
      status: "pending", code: code, expires_at: expires_at
    )
  end

  def create_confirmed_stamp(visit:, campaign:)
    Stamp.create!(
      visit: visit, campaign: campaign, customer: visit.customer, merchant: @merchant,
      status: "confirmed", confirmed_at: Time.current
    )
  end

  def organization_campaign_factory(slug)
    OrganizationCampaign.create!(
      organization: organizations(:one), name: "Other", slug: slug.to_s,
      starts_at: 1.day.ago, ends_at: 1.month.from_now, entry_policy: "cumulative",
      status: "active"
    ).tap { |c| c.merchants << @merchant }
  end
end
