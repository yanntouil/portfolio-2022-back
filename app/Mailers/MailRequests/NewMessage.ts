import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail'
import Env from '@ioc:Adonis/Core/Env'
import MailRequest from 'App/Models/MailRequest'
import MailRequestMessage from 'App/Models/MailRequestMessage'

export default class NewMessage extends BaseMailer {
  constructor (private payload: { mailRequest: MailRequest, mailRequestMessage: MailRequestMessage, link: string }) {
    super()
  }
  public prepare(message: MessageContract) {
    message
      .from(Env.get('SMTP_SENDER'))
      .to(this.payload.mailRequest.email)
      .subject(`Validation de l'email`)
      .htmlView('emails/mail-request/new-message', this.payload)
  }
}
