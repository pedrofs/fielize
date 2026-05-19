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

  # ----- enrollment_rows -----

  test "enrollment_rows orders by confirmed stamps DESC then consented_at DESC" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Rows Order", slug: "rows-order",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    campaign.prizes.create!(name: "Prêmio", threshold: 3, position: 0)
    CampaignMerchant.create!(organization_campaign: campaign, merchant: merchants(:one))

    older_customer = Customer.create!(phone: "+5553988880001", name: "Alice", lgpd_opted_in_at: Time.current)
    middle_customer = Customer.create!(phone: "+5553988880002", name: "Bob", lgpd_opted_in_at: Time.current)
    newer_customer = Customer.create!(phone: "+5553988880003", name: "Carla", lgpd_opted_in_at: Time.current)

    Enrollment.create!(customer: older_customer,  campaign: campaign, consented_at: 3.days.ago)
    Enrollment.create!(customer: middle_customer, campaign: campaign, consented_at: 2.days.ago)
    Enrollment.create!(customer: newer_customer,  campaign: campaign, consented_at: 1.day.ago)

    # Stamps: alice has 2 confirmed, bob has 0, carla has 0 — alice should be first.
    # Between bob and carla (both 0), the more recent consented_at wins (carla first).
    2.times do |i|
      visit = Visit.create!(customer: older_customer, merchant: merchants(:one), local_day: Date.current - i)
      Stamp.create!(visit: visit, campaign: campaign, customer: older_customer,
                    merchant: merchants(:one), status: "confirmed", confirmed_at: Time.current)
    end

    pagy, rows = campaign.enrollment_rows(page: 1, per_page: 25)

    customer_ids = rows.map { |r| r[:customer][:id] }
    assert_equal [ older_customer.id, newer_customer.id, middle_customer.id ], customer_ids
    assert_equal 3, pagy.count
  end

  test "enrollment_rows excludes pending stamps from confirmed stamp count" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Rows Pending", slug: "rows-pending",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    campaign.prizes.create!(name: "Prêmio", threshold: 3, position: 0)
    CampaignMerchant.create!(organization_campaign: campaign, merchant: merchants(:one))

    customer = Customer.create!(phone: "+5553988881001", name: "Diana", lgpd_opted_in_at: Time.current)
    Enrollment.create!(customer: customer, campaign: campaign, consented_at: 1.day.ago)

    confirmed_visit = Visit.create!(customer: customer, merchant: merchants(:one), local_day: Date.current)
    Stamp.create!(visit: confirmed_visit, campaign: campaign, customer: customer,
                  merchant: merchants(:one), status: "confirmed", confirmed_at: Time.current)

    pending_visit = Visit.create!(customer: customer, merchant: merchants(:one), local_day: Date.current - 1)
    Stamp.create!(visit: pending_visit, campaign: campaign, customer: customer,
                  merchant: merchants(:one), status: "pending",
                  code: "ABC123", expires_at: 1.hour.from_now)

    _pagy, rows = campaign.enrollment_rows(page: 1, per_page: 25)
    assert_equal 1, rows.first[:stamps_count]
  end

  test "enrollment_rows paginates the result" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Rows Pagination", slug: "rows-pagination",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    campaign.prizes.create!(name: "Prêmio", threshold: 3, position: 0)

    3.times do |i|
      Enrollment.create!(
        customer: Customer.create!(phone: "+555399888#{2000 + i}", name: "Cust #{i}",
                                   lgpd_opted_in_at: Time.current),
        campaign: campaign,
        consented_at: (i + 1).days.ago
      )
    end

    pagy, rows = campaign.enrollment_rows(page: 1, per_page: 2)
    assert_equal 2, rows.size
    assert_equal 3, pagy.count
    assert_equal 2, pagy.pages

    _pagy, rows2 = campaign.enrollment_rows(page: 2, per_page: 2)
    assert_equal 1, rows2.size
  end

  test "enrollment_rows cumulative progress is merchants_stamped / next_prize_threshold" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Rows Cumul", slug: "rows-cumul",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    campaign.prizes.create!(name: "Tier 1", threshold: 2, position: 0)
    campaign.prizes.create!(name: "Tier 2", threshold: 5, position: 1)

    moda = Merchant.create!(organization: org, name: "Moda Cumul", slug: "moda-cumul",
                            address: "X", latitude: -32.5, longitude: -53.3)
    CampaignMerchant.create!(organization_campaign: campaign, merchant: merchants(:one))
    CampaignMerchant.create!(organization_campaign: campaign, merchant: moda)

    customer = Customer.create!(phone: "+5553988882500", name: "Elena", lgpd_opted_in_at: Time.current)
    Enrollment.create!(customer: customer, campaign: campaign, consented_at: 1.day.ago)

    # One confirmed stamp at each of two merchants — merchants_stamped = 2 (matches Tier 1 = 2).
    [ merchants(:one), moda ].each do |m|
      v = Visit.create!(customer: customer, merchant: m, local_day: Date.current - rand(5))
      Stamp.create!(visit: v, campaign: campaign, customer: customer,
                    merchant: m, status: "confirmed", confirmed_at: Time.current)
    end

    _pagy, rows = campaign.enrollment_rows(page: 1, per_page: 25)
    progress = rows.first[:progress]

    assert_equal "cumulative", progress[:kind]
    assert_equal 2, progress[:merchants_stamped]
    # Already at Tier 1 (2) → next threshold is Tier 2 (5).
    assert_equal 5, progress[:next_prize_threshold]
  end

  test "enrollment_rows cumulative progress next_prize_threshold is nil when all tiers reached" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Rows Cumul Max", slug: "rows-cumul-max",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    campaign.prizes.create!(name: "Único", threshold: 1, position: 0)
    CampaignMerchant.create!(organization_campaign: campaign, merchant: merchants(:one))

    customer = Customer.create!(phone: "+5553988883300", name: "Felipe", lgpd_opted_in_at: Time.current)
    Enrollment.create!(customer: customer, campaign: campaign, consented_at: 1.day.ago)

    v = Visit.create!(customer: customer, merchant: merchants(:one), local_day: Date.current)
    Stamp.create!(visit: v, campaign: campaign, customer: customer,
                  merchant: merchants(:one), status: "confirmed", confirmed_at: Time.current)

    _pagy, rows = campaign.enrollment_rows(page: 1, per_page: 25)
    progress = rows.first[:progress]

    assert_equal 1, progress[:merchants_stamped]
    assert_nil progress[:next_prize_threshold]
  end

  test "enrollment_rows simple progress is entries count with day_cap applied" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Rows Simple Cap", slug: "rows-simple-cap",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "simple", day_cap: 1, status: "draft"
    )
    CampaignMerchant.create!(organization_campaign: campaign, merchant: merchants(:one))
    CampaignMerchant.create!(organization_campaign: campaign, merchant: merchants(:two))

    customer = Customer.create!(phone: "+5553988884400", name: "Gabi", lgpd_opted_in_at: Time.current)
    Enrollment.create!(customer: customer, campaign: campaign, consented_at: 1.day.ago)

    # Two stamps same day at different merchants → capped to 1 entry.
    v1 = Visit.create!(customer: customer, merchant: merchants(:one), local_day: Date.current)
    Stamp.create!(visit: v1, campaign: campaign, customer: customer,
                  merchant: merchants(:one), status: "confirmed", confirmed_at: Time.current)
    v2 = Visit.create!(customer: customer, merchant: merchants(:two), local_day: Date.current)
    Stamp.create!(visit: v2, campaign: campaign, customer: customer,
                  merchant: merchants(:two), status: "confirmed", confirmed_at: Time.current)

    _pagy, rows = campaign.enrollment_rows(page: 1, per_page: 25)
    progress = rows.first[:progress]

    assert_equal "simple", progress[:kind]
    assert_equal 1, progress[:entries]
  end

  test "enrollment_rows simple progress without day_cap counts every confirmed stamp" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Rows Simple Uncap", slug: "rows-simple-uncap",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "simple", day_cap: nil, status: "draft"
    )
    CampaignMerchant.create!(organization_campaign: campaign, merchant: merchants(:one))
    CampaignMerchant.create!(organization_campaign: campaign, merchant: merchants(:two))

    customer = Customer.create!(phone: "+5553988885500", name: "Hugo", lgpd_opted_in_at: Time.current)
    Enrollment.create!(customer: customer, campaign: campaign, consented_at: 1.day.ago)

    v1 = Visit.create!(customer: customer, merchant: merchants(:one), local_day: Date.current)
    Stamp.create!(visit: v1, campaign: campaign, customer: customer,
                  merchant: merchants(:one), status: "confirmed", confirmed_at: Time.current)
    v2 = Visit.create!(customer: customer, merchant: merchants(:two), local_day: Date.current)
    Stamp.create!(visit: v2, campaign: campaign, customer: customer,
                  merchant: merchants(:two), status: "confirmed", confirmed_at: Time.current)

    _pagy, rows = campaign.enrollment_rows(page: 1, per_page: 25)
    progress = rows.first[:progress]

    assert_equal "simple", progress[:kind]
    assert_equal 2, progress[:entries]
  end

  # ----- raffle_pool_sizes -----

  test "raffle_pool_sizes (cumulative) counts customers whose distinct-merchants reached each prize threshold" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Pool Cumul", slug: "pool-cumul",
      starts_at: 1.day.ago, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "active"
    )
    p3 = campaign.prizes.create!(name: "Tier A", threshold: 3, position: 0)
    p5 = campaign.prizes.create!(name: "Tier B", threshold: 5, position: 1)
    p8 = campaign.prizes.create!(name: "Tier C", threshold: 8, position: 2)

    # Eight distinct merchants in the campaign.
    merchants_list = 8.times.map do |i|
      m = Merchant.create!(organization: org, name: "Pool M#{i}", slug: "pool-m-#{i}",
                           address: "X", latitude: -32.5, longitude: -53.3)
      CampaignMerchant.create!(organization_campaign: campaign, merchant: m)
      m
    end

    # Three customers with 8 / 5 / 3 distinct-merchant confirmed stamps.
    [ 8, 5, 3 ].each_with_index do |n, idx|
      cust = Customer.create!(phone: "+555399898#{idx}001", name: "C#{idx}", lgpd_opted_in_at: Time.current)
      merchants_list.first(n).each_with_index do |m, j|
        v = Visit.create!(customer: cust, merchant: m, local_day: Date.current - j)
        Stamp.create!(visit: v, campaign: campaign, customer: cust, merchant: m,
                      status: "confirmed", confirmed_at: Time.current)
      end
    end

    sizes = campaign.raffle_pool_sizes

    assert_equal 3, sizes[p3.id], "≥3 distinct merchants: 3 customers"
    assert_equal 2, sizes[p5.id], "≥5 distinct merchants: 2 customers"
    assert_equal 1, sizes[p8.id], "≥8 distinct merchants: 1 customer"
  end

  test "raffle_pool_sizes (cumulative) excludes pending stamps" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Pool Cumul Pending", slug: "pool-cumul-pending",
      starts_at: 1.day.ago, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "active"
    )
    p1 = campaign.prizes.create!(name: "Tier", threshold: 1, position: 0)
    CampaignMerchant.create!(organization_campaign: campaign, merchant: merchants(:one))

    cust = Customer.create!(phone: "+5553988887701", name: "Pendente", lgpd_opted_in_at: Time.current)
    visit = Visit.create!(customer: cust, merchant: merchants(:one), local_day: Date.current)
    Stamp.create!(visit: visit, campaign: campaign, customer: cust, merchant: merchants(:one),
                  status: "pending", code: "ZZZ123", expires_at: 1.hour.from_now)

    assert_equal 0, campaign.raffle_pool_sizes[p1.id]
  end

  test "raffle_pool_sizes (simple, capped) sums min(stamps_per_day, day_cap) across customers" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Pool Simple Cap", slug: "pool-simple-cap",
      starts_at: 1.day.ago, ends_at: 1.month.from_now,
      entry_policy: "simple", day_cap: 2, status: "active"
    )
    prize = campaign.prizes.create!(name: "Sorteio", threshold: nil, position: 0)

    m1 = merchants(:one)
    m2 = Merchant.create!(organization: org, name: "Pool Simple M2", slug: "pool-simple-m2",
                          address: "X", latitude: -32.5, longitude: -53.3)
    m3 = Merchant.create!(organization: org, name: "Pool Simple M3", slug: "pool-simple-m3",
                          address: "X", latitude: -32.5, longitude: -53.3)
    [ m1, m2, m3 ].each { |m| CampaignMerchant.create!(organization_campaign: campaign, merchant: m) }

    cust = Customer.create!(phone: "+5553988887702", name: "CapCust", lgpd_opted_in_at: Time.current)

    # 3 confirmed stamps on the same day at 3 different merchants → capped to 2.
    [ m1, m2, m3 ].each do |m|
      v = Visit.create!(customer: cust, merchant: m, local_day: Date.current)
      Stamp.create!(visit: v, campaign: campaign, customer: cust, merchant: m,
                    status: "confirmed", confirmed_at: Time.current)
    end

    assert_equal 2, campaign.raffle_pool_sizes[prize.id]
  end

  test "raffle_pool_sizes (simple, uncapped) sums every confirmed stamp" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Pool Simple Uncap", slug: "pool-simple-uncap",
      starts_at: 1.day.ago, ends_at: 1.month.from_now,
      entry_policy: "simple", day_cap: nil, status: "active"
    )
    prize = campaign.prizes.create!(name: "Sorteio", threshold: nil, position: 0)

    m1 = merchants(:one)
    m2 = Merchant.create!(organization: org, name: "Pool Uncap M2", slug: "pool-uncap-m2",
                          address: "X", latitude: -32.5, longitude: -53.3)
    m3 = Merchant.create!(organization: org, name: "Pool Uncap M3", slug: "pool-uncap-m3",
                          address: "X", latitude: -32.5, longitude: -53.3)
    [ m1, m2, m3 ].each { |m| CampaignMerchant.create!(organization_campaign: campaign, merchant: m) }

    cust = Customer.create!(phone: "+5553988887703", name: "UncapCust", lgpd_opted_in_at: Time.current)
    [ m1, m2, m3 ].each do |m|
      v = Visit.create!(customer: cust, merchant: m, local_day: Date.current)
      Stamp.create!(visit: v, campaign: campaign, customer: cust, merchant: m,
                    status: "confirmed", confirmed_at: Time.current)
    end

    assert_equal 3, campaign.raffle_pool_sizes[prize.id]
  end

  test "raffle_pool_sizes returns empty hash for draft campaigns" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Pool Draft", slug: "pool-draft",
      starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "draft"
    )
    campaign.prizes.create!(name: "Tier", threshold: 1, position: 0)

    assert_equal({}, campaign.raffle_pool_sizes)
  end

  test "raffle_pool_sizes runs a single grouped SQL query for the pool aggregation" do
    org = organizations(:one)
    campaign = OrganizationCampaign.create!(
      organization: org, name: "Pool N1", slug: "pool-n1",
      starts_at: 1.day.ago, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: "active"
    )
    5.times do |i|
      campaign.prizes.create!(name: "Tier #{i}", threshold: i + 1, position: i)
    end
    CampaignMerchant.create!(organization_campaign: campaign, merchant: merchants(:one))
    campaign.reload

    # Count Stamp queries: should be O(1), not O(prizes).
    stamp_queries = 0
    counter = ->(_name, _start, _finish, _id, payload) do
      sql = payload[:sql]
      next if payload[:name].to_s.include?("SCHEMA")
      stamp_queries += 1 if sql.include?("stamps")
    end

    ActiveSupport::Notifications.subscribed(counter, "sql.active_record") do
      campaign.raffle_pool_sizes
    end

    assert_operator stamp_queries, :<=, 1, "expected one stamps query, got #{stamp_queries}"
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
