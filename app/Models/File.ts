import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, BelongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Folder from './Folder'
import User from './User'
import * as uuid from 'uuid'


/**
 * File model
 */
export default class File extends BaseModel {
  @column({ isPrimary: true })// uuid
  public id: string

  @column({})
  public name: string

  @column({})
  public extension: string

  @column({})
  public size: number

  @column({
    consume: (value: boolean) => !!value,
  })
  public favorite: boolean

  @column({})
  public access: 'writer' | 'admin'

  /**
   * Relations
   */

  @column({ serializeAs: null })
  public folderId: string | null
  @belongsTo(() => Folder, { foreignKey : 'folderId' })
  public folder: BelongsTo<typeof Folder>
  
  @column({ serializeAs: null })
  public userId: string
  @belongsTo(() => User, { foreignKey : 'userId' })
  public user: BelongsTo<typeof User>

  /**
   * Timestamps
   */
  @column.dateTime({ serializeAs: 'deletedAt' })
  public deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true, serializeAs: 'createdAt' })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: 'updatedAt' })
  public updatedAt: DateTime


  /**
   * Before create hook
   */
  @beforeCreate()
  public static beforeCreateHook(file: File) {
    if (!file.id) {
      file.id = uuid.v4()
    }
   }
 }
