import { schema, CustomMessages, rules } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class UpdateValidator {
  constructor(protected ctx: HttpContextContract) {}

  public schema = schema.create({
    username: schema.string.optional({ trim: true }, [
      rules.maxLength(25),
      rules.minLength(3),
    ]),
    email: schema.string.optional({ trim: true }, [
      rules.email(),
    ]),
    password: schema.string.optional(),
  })

  public messages: CustomMessages = {}
}
