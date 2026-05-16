require "test_helper"

class OrganizationCampaignTest < ActiveSupport::TestCase
  setup do
    @valid_attrs = {
      organization: organizations(:one),
      name: "OC Test",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative"
    }
  end

  # ----- presence + dates -----

  test "starts_at and ends_at are required" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(starts_at: nil, ends_at: nil))
    refute campaign.valid?
    assert_includes campaign.errors[:starts_at], "can't be blank"
    assert_includes campaign.errors[:ends_at],   "can't be blank"
  end

  test "ends_at must be after starts_at" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(starts_at: 1.day.from_now, ends_at: 1.hour.from_now))
    refute campaign.valid?
    assert_includes campaign.errors[:ends_at], "must be after starts_at"
  end

  # ----- entry_policy -----

  test "entry_policy is required" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(entry_policy: nil))
    refute campaign.valid?
    assert_includes campaign.errors[:entry_policy], "is not included in the list"
  end

  # ----- merchant_id must be blank -----

  test "merchant_id must be blank" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(merchant: merchants(:one)))
    refute campaign.valid?
    assert_includes campaign.errors[:merchant_id], "must be blank for OrganizationCampaign"
  end

  # ----- policy_specific_config: cumulative -----

  test "cumulative forbids day_cap" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(entry_policy: "cumulative", day_cap: 1))
    refute campaign.valid?
    assert_includes campaign.errors[:day_cap], "must be blank for cumulative"
  end

  # ----- policy_specific_config: simple -----

  test "simple accepts a positive day_cap" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(entry_policy: "simple", day_cap: 1))
    assert campaign.valid?, campaign.errors.full_messages.inspect
  end

  test "simple rejects day_cap of 0" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(entry_policy: "simple", day_cap: 0))
    refute campaign.valid?
    assert_includes campaign.errors[:day_cap], "must be a positive integer when set"
  end

  test "simple allows day_cap nil (no cap)" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(entry_policy: "simple", day_cap: nil))
    assert campaign.valid?, campaign.errors.full_messages.inspect
  end

  # ----- domain methods -----

  test "merchants_stamped_by returns distinct merchant ids" do
    campaign = campaigns(:pasaporte)
    merchant_ids = campaign.merchants_stamped_by(customers(:maria))
    assert_includes merchant_ids, merchants(:one).id
    assert_equal merchant_ids.uniq, merchant_ids
  end

  test "entries_for cumulative counts prizes whose threshold is reached" do
    campaign = campaigns(:pasaporte)
    # maria has 1 confirmed stamp at merchant one (from fixtures); pasaporte has a prize at threshold 6
    # So she should NOT have unlocked any tier yet.
    assert_equal 0, campaign.entries_for(customers(:maria))
  end

  # ----- merchants_stamp_summary -----

  test "merchants_stamp_summary returns one row per attached Merchant with confirmed stamp aggregates" do
    campaign = campaigns(:pasaporte)
    org = organizations(:one)

    # Fixtures: calzados (merchants:one) is attached to pasaporte; one confirmed
    # stamp by maria already exists. Attach two more merchants to exercise
    # multi-row aggregation including a zero-stamp case.
    moda = Merchant.create!(organization: org, name: "Moda Jaguarão", slug: "moda-jaguarao",
                            address: "X", latitude: -32.5, longitude: -53.3)
    livraria = Merchant.create!(organization: org, name: "Livraria Central", slug: "livraria-central",
                                address: "Y", latitude: -32.5, longitude: -53.3)
    CampaignMerchant.create!(organization_campaign: campaign, merchant: moda)
    CampaignMerchant.create!(organization_campaign: campaign, merchant: livraria)

    # Add a second customer + a pending stamp at calzados (must be excluded),
    # and one more confirmed stamp at moda from joao (distinct customer there).
    visit_joao_calzados = Visit.create!(customer: customers(:joao), merchant: merchants(:one))
    Stamp.create!(visit: visit_joao_calzados, campaign: campaign, customer: customers(:joao),
                  merchant: merchants(:one), status: "pending",
                  code: "ABC123", expires_at: 1.hour.from_now)

    visit_joao_moda = Visit.create!(customer: customers(:joao), merchant: moda)
    Stamp.create!(visit: visit_joao_moda, campaign: campaign, customer: customers(:joao),
                  merchant: moda, status: "confirmed", confirmed_at: Time.current)

    rows = campaign.merchants_stamp_summary.index_by { |r| r[:merchant_id] }

    assert_equal 3, rows.size

    calzados_row = rows[merchants(:one).id]
    assert_equal merchants(:one).name, calzados_row[:name]
    # Fixture confirmed stamp from maria (joao's stamp at calzados is pending and excluded).
    assert_equal 1, calzados_row[:stamps_count]
    assert_equal 1, calzados_row[:distinct_customers_count]
    assert_not_nil calzados_row[:joined_at]

    moda_row = rows[moda.id]
    assert_equal 1, moda_row[:stamps_count]
    assert_equal 1, moda_row[:distinct_customers_count]

    livraria_row = rows[livraria.id]
    assert_equal 0, livraria_row[:stamps_count]
    assert_equal 0, livraria_row[:distinct_customers_count]
  end

  test "merchants_stamp_summary distinct_customers_count counts distinct customer ids" do
    campaign = campaigns(:pasaporte)
    org = organizations(:one)

    moda = Merchant.create!(organization: org, name: "Moda Distinct", slug: "moda-distinct",
                            address: "Z", latitude: -32.5, longitude: -53.3)
    CampaignMerchant.create!(organization_campaign: campaign, merchant: moda)

    # Two confirmed stamps from maria at moda (different days), one confirmed from joao.
    # Distinct customer count should be 2, total stamps 3.
    v1 = Visit.create!(customer: customers(:maria), merchant: moda, local_day: Date.current)
    Stamp.create!(visit: v1, campaign: campaign, customer: customers(:maria),
                  merchant: moda, status: "confirmed", confirmed_at: Time.current)

    v2 = Visit.create!(customer: customers(:maria), merchant: moda, local_day: Date.current - 1)
    Stamp.create!(visit: v2, campaign: campaign, customer: customers(:maria),
                  merchant: moda, status: "confirmed", confirmed_at: 1.day.ago)

    v3 = Visit.create!(customer: customers(:joao), merchant: moda)
    Stamp.create!(visit: v3, campaign: campaign, customer: customers(:joao),
                  merchant: moda, status: "confirmed", confirmed_at: Time.current)

    moda_row = campaign.merchants_stamp_summary.find { |r| r[:merchant_id] == moda.id }
    assert_equal 3, moda_row[:stamps_count]
    assert_equal 2, moda_row[:distinct_customers_count]
  end

  test "merchants_stamp_summary excludes Merchants not attached to the Campaign" do
    campaign = campaigns(:pasaporte)
    org = organizations(:one)

    detached = Merchant.create!(organization: org, name: "Outsider", slug: "outsider",
                                address: "Q", latitude: -32.5, longitude: -53.3)

    merchant_ids = campaign.merchants_stamp_summary.map { |r| r[:merchant_id] }
    refute_includes merchant_ids, detached.id
  end

  # ----- merchants_not_yet_in_campaign -----

  test "merchants_not_yet_in_campaign returns Organization Merchants not in campaign_merchants" do
    campaign = campaigns(:pasaporte)
    org = organizations(:one)

    # Fixture: calzados (merchants:one) is already attached to pasaporte. Other org's
    # merchant (merchants:two) must never appear regardless of attachment state.
    available = Merchant.create!(organization: org, name: "Padaria Central",
                                 slug: "padaria-central", address: "X",
                                 latitude: -32.5, longitude: -53.3)
    other_org_merchant = merchants(:two) # belongs to organizations(:two)

    result = campaign.merchants_not_yet_in_campaign

    assert_includes result, available
    refute_includes result, merchants(:one)
    refute_includes result, other_org_merchant
  end

  test "merchants_not_yet_in_campaign is empty when every Organization Merchant is already attached" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "All-In", slug: "all-in",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    org.merchants.find_each do |m|
      CampaignMerchant.create!(organization_campaign: campaign, merchant: m)
    end

    assert_empty campaign.merchants_not_yet_in_campaign
  end

  # ----- attach_all_missing_merchants! -----

  test "attach_all_missing_merchants! attaches every unattached Organization Merchant" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Bulk Add", slug: "bulk-add",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    Merchant.create!(organization: org, name: "Sapataria Bulk", slug: "sapataria-bulk",
                     address: "X", latitude: -32.5, longitude: -53.3)
    Merchant.create!(organization: org, name: "Padaria Bulk", slug: "padaria-bulk",
                     address: "Y", latitude: -32.5, longitude: -53.3)

    expected = org.merchants.pluck(:id).sort

    assert_difference -> { campaign.campaign_merchants.count }, expected.size do
      campaign.attach_all_missing_merchants!
    end

    assert_equal expected, campaign.reload.merchant_ids.sort
  end

  test "attach_all_missing_merchants! is idempotent and skips already-attached Merchants" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Bulk Idempotent", slug: "bulk-idempotent",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    pre_attached = merchants(:one)
    CampaignMerchant.create!(organization_campaign: campaign, merchant: pre_attached)
    original_join_id = campaign.campaign_merchants.find_by!(merchant: pre_attached).id

    campaign.attach_all_missing_merchants!
    assert_equal org.merchants.pluck(:id).sort, campaign.reload.merchant_ids.sort

    # A second call must not create duplicates and must not replace the pre-existing join row.
    assert_no_difference -> { campaign.campaign_merchants.count } do
      campaign.attach_all_missing_merchants!
    end
    assert_equal original_join_id, campaign.campaign_merchants.find_by!(merchant: pre_attached).id
  end

  test "attach_all_missing_merchants! is a no-op when every Merchant is already attached" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Bulk All In", slug: "bulk-all-in",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    org.merchants.find_each do |m|
      CampaignMerchant.create!(organization_campaign: campaign, merchant: m)
    end

    assert_no_difference -> { campaign.campaign_merchants.count } do
      campaign.attach_all_missing_merchants!
    end
  end

  test "attach_all_missing_merchants! returns the newly-attached Merchants" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Bulk Returns", slug: "bulk-returns",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    pre_attached = merchants(:one)
    CampaignMerchant.create!(organization_campaign: campaign, merchant: pre_attached)
    added = Merchant.create!(organization: org, name: "Sapataria Return", slug: "sapataria-return",
                             address: "X", latitude: -32.5, longitude: -53.3)

    newly_attached = campaign.attach_all_missing_merchants!

    assert_equal [ added.id ], newly_attached.map(&:id)
  end

  test "entries_for simple counts capped per day" do
    campaign = OrganizationCampaign.create!(@valid_attrs.merge(
      name: "Simple Cap", entry_policy: "simple", day_cap: 1, status: "active"
    ))
    # maria already has one confirmed stamp at merchant one via fixtures, but it's against pasaporte.
    # Create stamps against this new campaign manually.
    visit = Visit.create!(customer: customers(:maria), merchant: merchants(:one))
    Stamp.create!(
      visit: visit,
      campaign: campaign,
      customer: customers(:maria),
      merchant: merchants(:one),
      status: "confirmed",
      confirmed_at: Time.current
    )
    # Same day, second stamp at a different merchant (the per-day unique
    # index on visits forbids two visits at the same merchant on one day).
    visit2 = Visit.create!(customer: customers(:maria), merchant: merchants(:two))
    Stamp.create!(
      visit: visit2,
      campaign: campaign,
      customer: customers(:maria),
      merchant: merchants(:two),
      status: "confirmed",
      confirmed_at: Time.current
    )
    # day_cap=1 caps it at 1 entry per day even though there are 2 stamps.
    assert_equal 1, campaign.entries_for(customers(:maria))
  end
end
