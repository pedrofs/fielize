# frozen_string_literal: true

class Merchants::LoyaltyProgram::PrizesController < Merchants::BaseController
  before_action :set_loyalty
  before_action :set_prize, only: %i[edit update destroy]

  with_breadcrumb label: "Cartão Fidelidade",
                  path: -> { merchants_loyalty_program_path }

  def new
    set_title "Novo prêmio"
    add_breadcrumb label: "Novo prêmio",
                   path: new_merchants_loyalty_program_prize_path

    render inertia: { prize: blank_prize }
  end

  def create
    prize = @loyalty.prizes.build(prize_params.merge(
      position: (@loyalty.prizes.maximum(:position) || 0) + 1
    ))

    if prize.save
      redirect_to merchants_loyalty_program_path, notice: "Prêmio adicionado."
    else
      redirect_to new_merchants_loyalty_program_prize_path,
                  inertia: { errors: prize.errors }
    end
  end

  def edit
    set_title @prize.name
    add_breadcrumb label: @prize.name,
                   path: edit_merchants_loyalty_program_prize_path(@prize)

    render inertia: { prize: serialize(@prize) }
  end

  def update
    if @prize.update(prize_params)
      redirect_to merchants_loyalty_program_path, notice: "Prêmio atualizado."
    else
      redirect_to edit_merchants_loyalty_program_prize_path(@prize),
                  inertia: { errors: @prize.errors }
    end
  end

  def destroy
    @prize.destroy
    redirect_to merchants_loyalty_program_path, notice: "Prêmio removido."
  end

  private

  def set_loyalty
    @loyalty = current_merchant.loyalty_campaign or raise ActiveRecord::RecordNotFound
  end

  def set_prize
    @prize = @loyalty.prizes.find(params[:id])
  end

  def prize_params
    params.expect(prize: %i[name threshold])
  end

  def blank_prize
    { id: nil, name: "", threshold: nil, position: nil }
  end

  def serialize(prize)
    {
      id: prize.id,
      name: prize.name,
      threshold: prize.threshold,
      position: prize.position
    }
  end
end
