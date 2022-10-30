import { schema, CustomMessages, rules } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class AdminUpdateValidator {
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
    role: schema.enum.optional(
      ['member', 'writer', 'admin'] as const
    ),
    profile: schema.object.optional().members({
      firstname: schema.string.optional({ trim: true }, [ rules.maxLength(50) ]),
      lastname: schema.string.optional({ trim: true }, [ rules.maxLength(50) ]),
      dob: schema.date.optional({}, [ rules.before('today'), rules.after(-100, 'years') ]),
      address: schema.string.optional({ trim: true }, [ rules.maxLength(255) ]),
      state: schema.string.optional({ trim: true }, [ rules.maxLength(255) ]),
      zip: schema.string.optional({ trim: true }, [ rules.maxLength(20) ]),
      city: schema.string.optional({ trim: true }, [ rules.maxLength(255) ]),
      country: schema.string.optional({ trim: true }, [ rules.maxLength(255) ]),
      phone: schema.string.optional({ trim: true }, [ rules.maxLength(255) ]),
      email: schema.string.optional({ trim: true }, [ rules.maxLength(255) ]),
      links: schema.array.optional([rules.minLength(1)]).members(
        schema.object().members({
          name: schema.string(),
          value: schema.string(),
        })
      )  
    })
  })

  public messages: CustomMessages = {}
}
