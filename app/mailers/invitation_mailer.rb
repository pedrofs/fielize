class InvitationMailer < ApplicationMailer
  def invite
    @invitation = params[:invitation]
    @organization = @invitation.organization

    mail subject: "Você foi convidado para entrar em #{@organization.name} no Fielize",
         to: @invitation.email
  end
end
