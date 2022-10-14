import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { types } from '@ioc:Adonis/Core/Helpers'




export type ProfileLinks = {
  name: string,
  value: string,
}


/**
 * User profile model
 */
export default class Profile extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  public id: number

  @column()
  public firstname: string
  @column()
  public lastname: string
  @column.date()
  public dob: DateTime | null

  @column()
  public address: string
  @column()
  public city: string
  @column()
  public state: string
  @column()
  public zip: string
  @column()
  public country: string

  @column()
  public phone: string
  @column()
  public email: string

  @column({// json
    consume: (value: string | ProfileLinks[]) => (types.isString(value)) ? JSON.parse(value) : value,
    prepare: (value: string | ProfileLinks[]) => (types.isArray(value)) ? JSON.stringify(value) : value,
  })
  public links: ProfileLinks[]

  @column()
  public avatar: string

  /**
   * Relations
   */
  @column({ serializeAs: null })
  public userId: string

}
