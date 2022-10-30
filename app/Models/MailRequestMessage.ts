import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import User from './User'
import * as uuid from 'uuid'

export default class MailRequestMessage extends BaseModel {
  @column({ isPrimary: true })
  public id: string

  @column({})
  public content: string

  /**
   * Relations
   */
  @column({})
  public fromUserId: string | null
  @belongsTo(() => User, { foreignKey : 'fromUserId' })
  public fromUser: BelongsTo<typeof User>
  @column({})
  public fromName: string | null

  @column({})
  public toUserId: string | null
  @belongsTo(() => User, { foreignKey : 'toUserId' })
  public toUser: BelongsTo<typeof User>
  @column({})
  public toName: string | null


  /**
   * Timestamps
   */
  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  /**
   * Before create hook
   */
  @beforeCreate()
  public static beforeCreateHook(mailRequestMessage: MailRequestMessage) {
    mailRequestMessage.id ??= uuid.v4()
  }


}
