import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import type User from 'App/Models/User'
import Env from '@ioc:Adonis/Core/Env'

export default class AccountSuspension extends BaseMailer {
  constructor (private payload: { user: User, message: string }) {
    super()
  }
  public prepare(message: MessageContract) {
    message
      .from(Env.get('SMTP_SENDER'))
      .to(this.payload.user.email)
      .subject(`Suspension de votre compte sur Ourway`)
      .htmlView('emails/admin/users/account-suspension', this.payload)
  }
}
