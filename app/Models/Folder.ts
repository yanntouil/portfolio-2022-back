import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, BelongsTo, belongsTo, column, HasMany, hasMany } from '@ioc:Adonis/Lucid/Orm'
import File from './File'
import User from './User'
import * as uuid from 'uuid'


/**
 * Folder model
 */
export default class Folder extends BaseModel {
  @column({ isPrimary: true })// uuid
  public id: string

  @column({})
  public name: string

  @column({})
  public access: 'writer' | 'admin'

  /**
   * Relations
   */
  @hasMany(() => File, { foreignKey : 'folderId' })
  public files: HasMany<typeof File>

  @column({ serializeAs: null })
  public parentId: string | null
  @belongsTo(() => Folder, { foreignKey : 'parentId' })
  public parent: BelongsTo<typeof Folder>
  @hasMany(() => Folder, { foreignKey : 'parentId' })
  public children: HasMany<typeof Folder>

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
  public static beforeCreateHook(folder: Folder) {
    if (!folder.id) {
      folder.id = uuid.v4()
    }
  }
}
