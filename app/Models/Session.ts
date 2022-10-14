import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { types } from '@ioc:Adonis/Core/Helpers'


type Meta = {

}

/**
 * User session model
 */
export default class Session extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  public id: number

  @column.dateTime({ serializeAs: 'loginAt' })
  public loginAt: DateTime | null

  @column({// json
    consume: (value: string | Meta) => (types.isString(value)) ? JSON.parse(value) : value,
    prepare: (value: string | Meta) => (types.isObject(value)) ? JSON.stringify(value) : value,
  })
  public meta: Meta

  /**
   * Relations
   */
  @column({ serializeAs: null })
  public userId: string

}
