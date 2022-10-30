import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import type User from 'App/Models/User'
import Env from '@ioc:Adonis/Core/Env'

export default class AccountDeletion extends BaseMailer {
  constructor (private payload: { user: User }) {
    super()
  }
  public prepare(message: MessageContract) {
    message
      .from(Env.get('SMTP_SENDER'))
      .to(this.payload.user.email)
      .subject(`Suppression de votre compte sur Ourway`)
      .htmlView('emails/admin/users/account-deletion', this.payload)
  }
}
