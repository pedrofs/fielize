require "test_helper"

class OrganizationCampaign::RedeemTest < ActiveSupport::TestCase
  setup do
    @org      = organizations(:one)
    @campaign = OrganizationCampaign.create!(
      organization: @org,
      name: "Redeem #{SecureRandom.hex(4)}",
      starts_at: 2.days.ago, ends_at: 1.day.ago,
      entry_policy: "cumulative",
      status: "ended"
    )
    @prize    = @campaign.prizes.create!(name: "Top", threshold: 1, position: 0)
    @winner   = customers(:maria)
    @user     = users(:admin)
  end

  test "redeem! creates a Redemption against the prize's Raffle" do
    raffle = draw_raffle_for(@prize, winner: @winner)

    assert_difference -> { Redemption.count }, 1 do
      @campaign.redeem!(customer: @winner, prize: @prize, by: @user)
    end

    redemption = Redemption.last
    assert_equal @winner.id,   redemption.customer_id
    assert_equal @campaign.id, redemption.campaign_id
    assert_equal @prize.id,    redemption.prize_id
    assert_equal raffle.id,    redemption.raffle_id
    assert_equal @user.id,     redemption.redeemed_by_user_id
    assert_nil   redemption.merchant_id
    assert_nil   redemption.threshold_snapshot
  end

  test "redeem! is idempotent — re-calling returns the existing Redemption" do
    draw_raffle_for(@prize, winner: @winner)
    existing = @campaign.redeem!(customer: @winner, prize: @prize, by: @user)

    assert_no_difference -> { Redemption.count } do
      again = @campaign.redeem!(customer: @winner, prize: @prize, by: @user)
      assert_equal existing.id, again.id
    end
  end

  test "redeem! refuses when no Raffle has been drawn yet" do
    assert_raises(ActiveRecord::RecordInvalid) do
      @campaign.redeem!(customer: @winner, prize: @prize, by: @user)
    end
  end

  test "redeem! refuses when the Raffle had no winner" do
    Raffle.create!(
      campaign: @campaign, prize: @prize, drawn_at: Time.current,
      seed: SecureRandom.hex(16), status: "no_winner"
    )
    assert_raises(ActiveRecord::RecordInvalid) do
      @campaign.redeem!(customer: @winner, prize: @prize, by: @user)
    end
  end

  test "redeem! refuses when the customer is not the raffle winner" do
    draw_raffle_for(@prize, winner: @winner)
    intruder = customers(:joao)
    assert_raises(ActiveRecord::RecordInvalid) do
      @campaign.redeem!(customer: intruder, prize: @prize, by: @user)
    end
  end

  private

  def draw_raffle_for(prize, winner:)
    Raffle.create!(
      campaign: @campaign, prize: prize, winner_customer: winner,
      drawn_at: Time.current, seed: SecureRandom.hex(16), status: "drawn"
    )
  end
end
