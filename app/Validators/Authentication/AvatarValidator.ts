import { schema, CustomMessages } from '@ioc:Adonis/Core/Validator'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class AvatarValidator {
  constructor(protected ctx: HttpContextContract) {}

  public schema = schema.create({
    avatar: schema.file({
      size: '2mb',
      extnames: ['jpg', 'jpeg', 'gif', 'png', 'webp'],
    }),
  })

  public messages: CustomMessages = {}
}
