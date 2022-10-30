import { schema, CustomMessages, rules } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class CreateMessageValidator {
  constructor(protected ctx: HttpContextContract) {}

  public schema = schema.create({
    message: schema.string({ trim: true }, [ rules.maxLength(255) ]),
  })

  public messages: CustomMessages = {}
}
