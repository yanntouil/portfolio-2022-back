import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, BelongsTo, belongsTo, column, HasMany, hasMany } from '@ioc:Adonis/Lucid/Orm'
import CamelCaseNamingStrategy from 'App/Strategies/CamelCaseNamingStrategy'
import * as uuid from 'uuid'
import MailRequestMessage from './MailRequestMessage'
import User from './User'


export const MailRequestTypes = ['accountSuspension'] as const

export default class MailRequest extends BaseModel {
  public static namingStrategy = new CamelCaseNamingStrategy()
  
  @column({ isPrimary: true })
  public id: string

  @column({})
  public subject: string

  @column({})
  public token: string

  @column({})
  public email: string

  @column({})
  public type: MailRequestType

  @column({})
  public status: MailRequestStatus

  /**
   * Relations
   */
  @column({})
  public userId: string | null
  @belongsTo(() => User, { foreignKey : 'userId' })
  public user: BelongsTo<typeof User>
  @column({})
  public username: string | null

  @hasMany(() => MailRequestMessage, { foreignKey : 'requestId' })
  public message: HasMany<typeof MailRequestMessage>

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
  public static beforeCreateHook(mailRequest: MailRequest) {
    mailRequest.id ??= uuid.v4()
  }




}


/**
 * Types
 */
type MailRequestType = 'accountSuspension' | 'other'
type MailRequestStatus = 'waitingFromUser' | 'waitingFromAdmin' | 'resolved'