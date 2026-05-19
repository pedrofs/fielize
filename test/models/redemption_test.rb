require "test_helper"

class RedemptionTest < ActiveSupport::TestCase
  # ----- LoyaltyCampaign rules -----

  setup do
    @loyalty_campaign = campaigns(:cartao_calzados)
    @prize    = prizes(:cartao_cafe)
    @customer = customers(:maria)
    @merchant = @loyalty_campaign.merchant
    @valid_attrs = {
      customer: @customer,
      campaign: @loyalty_campaign,
      prize: @prize,
      merchant: @merchant,
      threshold_snapshot: 5
    }
  end

  test "threshold_snapshot is required for loyalty redemption" do
    redemption = Redemption.new(@valid_attrs.merge(threshold_snapshot: nil))
    refute redemption.valid?
    assert_includes redemption.errors[:threshold_snapshot], "is not a number"
  end

  test "threshold_snapshot must be a positive integer for loyalty redemption" do
    zero = Redemption.new(@valid_attrs.merge(threshold_snapshot: 0))
    refute zero.valid?
    assert_includes zero.errors[:threshold_snapshot], "must be greater than 0"

    negative = Redemption.new(@valid_attrs.merge(threshold_snapshot: -1))
    refute negative.valid?
    assert_includes negative.errors[:threshold_snapshot], "must be greater than 0"

    fractional = Redemption.new(@valid_attrs.merge(threshold_snapshot: 1.5))
    refute fractional.valid?
    assert_includes fractional.errors[:threshold_snapshot], "must be an integer"
  end

  test "LoyaltyCampaign redemption requires merchant_id" do
    redemption = Redemption.new(@valid_attrs.merge(merchant: nil))
    refute redemption.valid?
    assert_includes redemption.errors[:merchant_id], "é obrigatório para resgate de Cartão Fidelidade"
  end

  test "LoyaltyCampaign redemption: merchant must match campaign's merchant" do
    redemption = Redemption.new(@valid_attrs.merge(merchant: merchants(:two)))
    refute redemption.valid?
    assert_includes redemption.errors[:merchant_id], "deve corresponder ao lojista da campanha"
  end

  test "redeemed_by_user must belong to the redemption's merchant" do
    other_user = users(:admin)
    redemption = Redemption.new(@valid_attrs.merge(redeemed_by_user: other_user))
    refute redemption.valid?
    assert_includes redemption.errors[:redeemed_by_user], "deve pertencer ao lojista do resgate"
  end

  test "redeemed_by_user matching the merchant is accepted" do
    staff = users(:merchant_staff)
    redemption = Redemption.new(@valid_attrs.merge(redeemed_by_user: staff))
    assert redemption.valid?, redemption.errors.full_messages.inspect
  end

  test "LoyaltyCampaign redemption rejects raffle_id" do
    raffle = build_raffle_with_winner(@customer)
    redemption = Redemption.new(@valid_attrs.merge(raffle: raffle))
    refute redemption.valid?
    assert_includes redemption.errors[:raffle_id], "deve estar em branco para resgate de Cartão Fidelidade"
  end

  test "valid LoyaltyCampaign redemption persists" do
    assert_difference -> { Redemption.count }, 1 do
      Redemption.create!(@valid_attrs)
    end
  end

  # ----- OrganizationCampaign rules -----

  test "OrganizationCampaign redemption requires raffle_id" do
    pasaporte = campaigns(:pasaporte)
    pasaporte_prize = prizes(:pasaporte_iphone)
    redemption = Redemption.new(
      customer: @customer,
      campaign: pasaporte,
      prize: pasaporte_prize
    )
    refute redemption.valid?
    assert_includes redemption.errors[:raffle_id], "é obrigatório para resgate de sorteio"
  end

  test "OrganizationCampaign redemption rejects merchant_id" do
    raffle = build_raffle_with_winner(@customer)
    redemption = Redemption.new(
      customer: @customer,
      campaign: raffle.campaign,
      prize: raffle.prize,
      raffle: raffle,
      merchant: @merchant
    )
    refute redemption.valid?
    assert_includes redemption.errors[:merchant_id], "deve estar em branco para resgate de sorteio"
  end

  test "OrganizationCampaign redemption rejects threshold_snapshot" do
    raffle = build_raffle_with_winner(@customer)
    redemption = Redemption.new(
      customer: @customer,
      campaign: raffle.campaign,
      prize: raffle.prize,
      raffle: raffle,
      threshold_snapshot: 6
    )
    refute redemption.valid?
    assert_includes redemption.errors[:threshold_snapshot], "deve estar em branco para resgate de sorteio"
  end

  test "OrganizationCampaign redemption rejects mismatched winner" do
    raffle = build_raffle_with_winner(@customer)
    other_customer = customers(:joao)
    redemption = Redemption.new(
      customer: other_customer,
      campaign: raffle.campaign,
      prize: raffle.prize,
      raffle: raffle
    )
    refute redemption.valid?
    assert_includes redemption.errors[:customer_id], "deve corresponder ao vencedor do sorteio"
  end

  test "OrganizationCampaign redemption rejects mismatched prize" do
    raffle = build_raffle_with_winner(@customer)
    other_prize = Prize.create!(campaign: raffle.campaign, name: "Outro", threshold: 1, position: 99)
    redemption = Redemption.new(
      customer: @customer,
      campaign: raffle.campaign,
      prize: other_prize,
      raffle: raffle
    )
    refute redemption.valid?
    assert_includes redemption.errors[:prize_id], "deve corresponder ao prêmio do sorteio"
  end

  test "valid OrganizationCampaign redemption persists" do
    raffle = build_raffle_with_winner(@customer)
    assert_difference -> { Redemption.count }, 1 do
      Redemption.create!(
        customer: @customer,
        campaign: raffle.campaign,
        prize: raffle.prize,
        raffle: raffle,
        redeemed_by_user: users(:admin)
      )
    end
  end

  private

  def build_raffle_with_winner(customer)
    pasaporte = campaigns(:pasaporte)
    pasaporte_prize = prizes(:pasaporte_iphone)
    Raffle.create!(
      campaign: pasaporte,
      prize: pasaporte_prize,
      winner_customer: customer,
      drawn_at: Time.current,
      seed: SecureRandom.hex(16),
      status: "drawn"
    )
  end
end
