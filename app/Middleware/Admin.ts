import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import type User from 'App/Models/User'

export default class Admin {
  public async handle({auth, response}: HttpContextContract, next: () => Promise<void>) {
    const user = auth.use('api').user as User
    if (user.role !== 'admin') {
      return response.forbidden({ code: 'RESOURCE_NOT_ALLOWED' })
    }
    await next()
  }
}
