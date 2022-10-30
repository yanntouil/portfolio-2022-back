import { schema, CustomMessages, rules } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { MailRequestTypes } from 'App/Models/MailRequest'

export default class CreateAsUserValidator {
  constructor(protected ctx: HttpContextContract) {}

  public schema = schema.create({
    subject: schema.string({ trim: true }, [ rules.maxLength(50) ]),
    message: schema.string({ trim: true }, [ rules.maxLength(255) ]),
    type: schema.enum(MailRequestTypes),
  })

  public messages: CustomMessages = {}
}
