import { DateTime } from 'luxon'
import Hash from '@ioc:Adonis/Core/Hash'
import { column, beforeSave, BaseModel, beforeCreate, afterCreate, hasOne, HasOne, scope, PreloaderContract } from '@ioc:Adonis/Lucid/Orm'
import Profile from './Profile'
import Session from './Session'
import * as uuid from 'uuid'
import CamelCaseNamingStrategy from 'App/Strategies/CamelCaseNamingStrategy'




/**
 * User Model
 */
export default class User extends BaseModel {
  public static namingStrategy = new CamelCaseNamingStrategy()

  @column({ isPrimary: true })// uuid
  public id: string

  @column()// user visible name and use in login
  public username: string

  @column({ serializeAs: null })// use in login
  public password: string  

  @column({ serializeAs: null })// used to log in the user if the password is lost
  public authenticationToken: string

  @column.dateTime({ serializeAs: null })// use to avoid too many requests on recover password
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
    user.id ??= uuid.v4()
    user.role ??= 'member'
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




  /**
   * Scopes
   */
  public static active = scope((query) => {
    query.where('status', 'active')
  })




  /**
   * Serialize
   */
  serializeOwner() {
    return {
      ...this.serialize(),
      email: this.email,
      pendingEmail: this.pendingEmail,
      rememberMeToken: this.rememberMeToken,
    } as UserOwner
  }
  public serializeAdmin() {
    return {
      ...this.serialize(),
      email: this.email,
      pendingEmail: this.pendingEmail,
    } as UserAdmin
  }




  /**
   * Loader
   */
  public static async memberPreloader(loader: PreloaderContract<User>) {
    return loader
      .load('profile')
  }
  public static async ownerPreloader(loader: PreloaderContract<User>) {
    return loader
      .load('session')
      .load('profile')
  }
  public static async adminPreloader(loader: PreloaderContract<User>) {
    return loader
      .load('session')
      .load('profile')
  }


}



/**
 * Types
 */
export type UserRole = 'member' | 'writer' | 'admin'
export type UserStatus = 'pending' | 'active' | 'deleted' | 'suspended'
export type UserMember = Pick<User, 'id' | 'username' | 'role' | 'status'> & {
  profile: Omit<Profile, 'id'>
}
export type UserOwner = UserMember & Pick<User, 'email' | 'pendingEmail' | 'rememberMeToken'> & {
  session: Omit<Session, 'id'>
}
export type UserAdmin = UserMember & Pick<User, 'email' | 'pendingEmail'> & {
  session: Omit<Session, 'id'>
}
