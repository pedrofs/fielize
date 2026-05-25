# frozen_string_literal: true

require "test_helper"

# Customer::Wallet aggregates a customer's Cards across all enrollments and
# buckets them by Card#section. These tests assert bucketing + section order
# for a mixed loyalty enrollment set.
class Customer::WalletTest < ActiveSupport::TestCase
  setup do
    @customer = customers(:maria)
    @merchant = merchants(:one)
    @org      = @merchant.organization
    @day      = 1 # cleared past the maria_at_calzados fixture (Date.yesterday)
  end

  test "buckets loyalty cards by section, ordered para_resgatar/ativas/encerradas" do
    collecting = loyalty_campaign("Coletando")
    redeemable = loyalty_campaign("Resgatável")
    disabled   = loyalty_campaign("Encerrada")

    [ collecting, redeemable, disabled ].each { |c| c.enroll!(customer: @customer) }

    add_confirmed_stamps(redeemable, 5) # reaches the threshold
    add_confirmed_stamps(collecting, 2)
    disabled.update!(status: "ended")

    sections = Customer::Wallet.new(@customer).sections

    assert_equal %w[para_resgatar ativas encerradas], sections.keys
    assert_equal [ redeemable.id ], sections["para_resgatar"].map { |card| card.campaign.id }
    assert_equal [ collecting.id ], sections["ativas"].map { |card| card.campaign.id }
    assert_equal [ disabled.id ], sections["encerradas"].map { |card| card.campaign.id }
  end

  test "renders OrganizationCampaign cards alongside loyalty cards" do
    campaigns(:pasaporte).enroll!(customer: @customer) # active cumulative OrganizationCampaign

    sections = Customer::Wallet.new(@customer).sections

    assert_equal [ campaigns(:pasaporte).id ], sections["ativas"].map { |card| card.campaign.id }
    assert_equal "cumulative", sections["ativas"].first.progress[:kind]
  end

  test "buckets a mixed multi-org enrollment set across organizations" do
    org_two = organizations(:two)

    collecting    = loyalty_campaign("Fidelidade")             # org one  → ativas
    won           = org_campaign(org_two, status: "drawn")     # org two  → para_resgatar
    awaiting_draw = org_campaign(@org, status: "ended")        # org one  → ativas
    lost          = org_campaign(org_two, status: "drawn")     # org two  → encerradas

    [ collecting, won, awaiting_draw, lost ].each { |c| c.enroll!(customer: @customer) }
    add_confirmed_stamps(collecting, 2)
    make_winner(won, @customer)
    make_winner(lost, customers(:joao)) # someone else won → maria lost

    sections = Customer::Wallet.new(@customer).sections

    assert_equal [ won.id ], sections["para_resgatar"].map { |card| card.campaign.id }
    assert_equal [ collecting.id, awaiting_draw.id ].sort,
      sections["ativas"].map { |card| card.campaign.id }.sort
    assert_equal [ lost.id ], sections["encerradas"].map { |card| card.campaign.id }

    org_ids = sections.values.flatten.map { |card| card.organization.id }
    assert_includes org_ids, @org.id, "wallet spans the loyalty card's organization"
    assert_includes org_ids, org_two.id, "wallet spans the org campaign's organization"
  end

  test "is empty for a nil customer" do
    sections = Customer::Wallet.new(nil).sections

    assert_equal %w[para_resgatar ativas encerradas], sections.keys
    assert_empty sections.values.flatten
  end

  private

  def loyalty_campaign(name)
    campaign = LoyaltyCampaign.create!(
      organization: @org, merchant: @merchant, name: name, status: "active"
    )
    campaign.prizes.create!(name: "Prêmio", threshold: 5, position: 0)
    campaign
  end

  def add_confirmed_stamps(campaign, count)
    count.times do
      @day += 1
      visit = Visit.create!(customer: @customer, merchant: @merchant, local_day: Date.current - @day)
      Stamp.create!(
        visit: visit, campaign: campaign, customer: @customer, merchant: @merchant,
        status: "confirmed", confirmed_at: Time.current
      )
    end
  end

  def org_campaign(organization, status:, thresholds: [ 2 ])
    campaign = OrganizationCampaign.create!(
      organization: organization,
      name: "Org #{SecureRandom.hex(3)}",
      starts_at: 2.months.ago, ends_at: 1.month.from_now,
      entry_policy: "cumulative", status: status
    )
    thresholds.each_with_index do |threshold, i|
      campaign.prizes.create!(name: "Prêmio #{threshold}", threshold: threshold, position: i)
    end
    campaign
  end

  def make_winner(campaign, customer)
    Raffle.create!(
      prize: campaign.prizes.first, campaign: campaign, winner_customer: customer,
      status: "drawn", seed: SecureRandom.hex(8), drawn_at: Time.current
    )
  end
end
