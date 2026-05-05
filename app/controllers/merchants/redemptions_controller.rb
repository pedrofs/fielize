# frozen_string_literal: true

class Merchants::RedemptionsController < Merchants::BaseController
  with_title "Resgatar prêmio"
  with_breadcrumb label: "Resgatar prêmio",
                  path: -> { new_merchants_redemption_path }

  def new
    render inertia: { phone: "", preview: nil }
  end

  def create
    phone = Customer.normalize_phone(params[:phone])
    return reject("Telefone inválido.") unless phone

    customer = Customer.find_by(phone: phone)
    return reject("Cliente não encontrado.") unless customer

    if params[:loyalty_prize_id].present?
      confirm(customer)
    else
      preview(customer)
    end
  end

  private

  def preview(customer)
    loyalty = current_merchant.loyalty_campaign
    return reject("Cartão Fidelidade não está ativo.") unless loyalty&.active?

    balance = loyalty.balance_for(customer)
    prizes  = loyalty.prizes.order(:threshold).map do |prize|
      {
        id: prize.id,
        name: prize.name,
        threshold: prize.threshold,
        claimable: balance >= prize.threshold,
        missing: [ prize.threshold - balance, 0 ].max
      }
    end

    render inertia: "merchants/redemptions/new", props: {
      phone: customer.phone,
      preview: {
        customer: serialize_customer(customer),
        balance: balance,
        prizes: prizes
      }
    }
  end

  def confirm(customer)
    loyalty = current_merchant.loyalty_campaign
    return reject("Cartão Fidelidade não está ativo.") unless loyalty&.active?

    prize = loyalty.prizes.find(params[:loyalty_prize_id])
    loyalty.redeem!(customer: customer, prize: prize, by: current_user)
    redirect_to root_path, notice: "Resgate confirmado."
  rescue ActiveRecord::RecordInvalid => e
    redirect_to new_merchants_redemption_path,
                inertia: { errors: { base: e.record.errors.full_messages.to_sentence } }
  end

  def reject(msg)
    redirect_to new_merchants_redemption_path, inertia: { errors: { base: msg } }
  end

  def serialize_customer(customer)
    {
      id: customer.id,
      name: customer.name.presence || customer.phone,
      phone: customer.phone
    }
  end
end
