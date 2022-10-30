import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import type User from 'App/Models/User'
import Env from '@ioc:Adonis/Core/Env'

export default class EmailValidation extends BaseMailer {
  constructor (private payload: { user: User, link: string }) {
    super()
  }
  public prepare(message: MessageContract) {
    message
      .from(Env.get('SMTP_SENDER'))
      .to(this.payload.user.pendingEmail)
      .subject(`Mise à jour de votre e-mail sur Ourway`)
      .htmlView('emails/admin/users/email-validation', {
        ...this.payload, 
        user: { 
          ...this.payload.user, 
          email: this.payload.user.pendingEmail 
        }
      })
  }
}
