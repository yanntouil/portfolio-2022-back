import { schema, CustomMessages, rules } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class AdminCreateValidator {
  constructor(protected ctx: HttpContextContract) {}

  public schema = schema.create({
    username: schema.string({ trim: true }, [
      rules.maxLength(25),
      rules.minLength(3),
      rules.unique({ table: 'users', column: 'username' }),
    ]),
    email: schema.string({ trim: true }, [
      rules.email(),
      rules.unique({ table: 'users', column: 'email' }),
    ]),
    password: schema.string(),
    role: schema.enum(
      ['member', 'writer', 'admin'] as const
    ),
    message: schema.string(),
  })

  public messages: CustomMessages = {}
}
