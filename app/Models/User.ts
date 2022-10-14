import { DateTime } from 'luxon'
import Hash from '@ioc:Adonis/Core/Hash'
import { column, beforeSave, BaseModel, beforeCreate, afterCreate, hasOne, HasOne } from '@ioc:Adonis/Lucid/Orm'
import Profile from './Profile'
import Session from './Session'
import * as uuid from 'uuid'


export type UserRole = 'member' | 'writer' | 'admin'
export type UserStatus = 'pending' | 'active' | 'deleted' | 'suspended'

/**
 * User Model
 */
export default class User extends BaseModel {
  @column({ isPrimary: true })// uuid
  public id: string

  @column()// user visible name and use in login
  public username: string

  @column({ serializeAs: null })// use in login
  public password: string  

  @column({ serializeAs: null })// used to log in the user if the password is lost
  public authenticationToken: string

  @column.dateTime({ serializeAs: 'recoverPassword' })// use to avoid too many requests on recover password
  public recoverPassword: DateTime | null

  @column({ serializeAs: null})// use in login and as contact
  public email: string

  @column({ serializeAs: null})// email that has not yet been validated
  public pendingEmail: string

  @column({ serializeAs: null})// use to validate new email or email update
  public emailToken: string

  @column({ serializeAs: null})// use to autologin user
  public rememberMeToken?: string

  @column()// used to restrict access
  public role: UserRole

  @column()// account status
  public status: UserStatus

  /**
   * Relations
   */
  
  @hasOne(() => Profile)
  public profile: HasOne<typeof Profile>

  @hasOne(() => Session)
  public session: HasOne<typeof Session>

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
   * Before save hook
   */
  @beforeSave()
  public static async beforeSaveHook (User: User) {
    if (User.$dirty.password) {
      User.password = await Hash.make(User.password)
    }
  }

  /**
   * Before create hook
   */
  @beforeCreate()
  public static beforeCreateHook(user: User) {
    if (!user.id) {
      user.id = uuid.v4()
    }
  }

  /**
   * After create hook
   */
  @afterCreate()
  public static async afterCreateHook(user: User) {
    await Promise.all([
      user.related('profile').create({}),
      user.related('session').create({}),
    ])
  }
}



/**
 * Serialize owner data
 */
export const userOwner = (user: User) => ({
  ...user.serialize(),
  email: user.email,
  pendingEmail: user.pendingEmail,
  rememberMeToken: user.rememberMeToken,
  // ...user.serialize({ fields: { pick: [ 'email', 'pendingEmail', 'rememberMeToken' ]}}),
})