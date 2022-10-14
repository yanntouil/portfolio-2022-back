import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import type User from 'App/Models/User'
import Env from '@ioc:Adonis/Core/Env'

export default class RecoverPassword extends BaseMailer {
  constructor (private payload: { user: User, link: string }) {
    super()
  }
  public prepare(message: MessageContract) {
    message
      .from(Env.get('SMTP_SENDER'))
      .to(this.payload.user.email)
      .subject('Recupération du mot de passe')
      .htmlView('emails/authentication/recover-password', this.payload)
  }
}
