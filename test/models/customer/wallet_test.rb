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

  test "skips campaigns that do not yet render a Card (e.g. OrganizationCampaign)" do
    campaigns(:pasaporte).enroll!(customer: @customer) # OrganizationCampaign

    sections = Customer::Wallet.new(@customer).sections

    assert_empty sections.values.flatten
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
end
