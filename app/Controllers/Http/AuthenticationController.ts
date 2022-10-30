import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import foldersConfig from 'Config/folders'
import Hash from '@ioc:Adonis/Core/Hash'
import { DateTime } from 'luxon'
import { cuid } from '@ioc:Adonis/Core/Helpers'
import Drive from '@ioc:Adonis/Core/Drive'
import { tokenGenerate } from 'App/Helpers/token'
import ApiToken from 'App/Models/ApiToken'
import User from 'App/Models/User'
import RegisterValidator from 'App/Validators/Authentication/RegisterValidator'
import SignInValidator from 'App/Validators/Authentication/SignInValidator'
import RecoverPasswordValidator from 'App/Validators/Authentication/RecoverPasswordValidator'
import MetaValidator from 'App/Validators/Authentication/MetaValidator'
import UpdateValidator from 'App/Validators/Authentication/UpdateValidator'
import RegistrerMailer from 'App/Mailers/Authentication/Register'
import ProfileValidator from 'App/Validators/Authentication/ProfileValidator'
import AvatarValidator from 'App/Validators/Authentication/AvatarValidator'
import RecoverPasswordMailer from 'App/Mailers/Authentication/RecoverPassword'
import EmailValidationMailer from 'App/Mailers/Authentication/EmailValidation'
import frontendConfig from 'Config/frontend'



const development = Env.get('NODE_ENV') === 'development'



/**
 * Authentication controller
 * Todo
 * - mettre en place une messagerie pour géré les négociations suite au suspension
 */
export default class AuthenticationController {

    /**
     * Session
     * @get authentication/
     * @middleware silentAuth
     * @success 200 { session: true, user: UserOwner } | { session: false }
     */
    public async session({ auth, response }: HttpContextContract) {
        const user = auth.use('api').user as User
        if (!user) {
            return response.ok({ session: false })
        }
        
        // preload user relations
        await user.load(User.ownerPreloader)

        response.ok({ 
            session: true, 
            user: user.serializeOwner(),
        })
    }


    /**
     * Registrer
     * @post authentication/register
     * @body { username: string, email: string, password: string }
     * @success 200 { emailToken: string } in development
     * ***      204 
     * @error 400 VALIDATION_FAILURE
     * ***    400 VALIDATION_FAILURE
     */
    public async register({ request, response }: HttpContextContract) {
        const { username, password, email } = await request.validate(RegisterValidator)

        // create user
        const emailToken = tokenGenerate()
        const link = frontendConfig.mail.register + emailToken
        const user = await User.create({
            username,
            password,
            pendingEmail: email.toLowerCase(),
            emailToken,
        })

        // send validation mail
        await new RegistrerMailer({ user, link }).send()

        return development ? response.ok({ emailToken }) : response.noContent()
    }


    /**
     * Sign in
     * @post authentication/sign-in
     * @body { username?: string, email?: string, password: string }
     * @success 200 { user: UserOwner, token: string }
     * @error 400 VALIDATION_FAILURE | EMAIL_NOT_VALIDATED | INVALID_CREDENTIALS | ACCOUNT_NOT_ACTIVE
     */
    public async signIn({ auth, request, response }: HttpContextContract) {
        const { username, email, password } = await request.validate(SignInValidator)
        if(!username && !email) {
            return response.badRequest({ code: 'VALIDATION_FAILURE', errors: [{ field: 'username|email', rule: 'required' } ] })
        }
        const user = await User.findBy(username ? 'username' : 'email', username ? username : email)
        if (!user && await User.findBy('pendingEmail', email)) {// check email is not validated
            return response.badRequest({ code: 'INVALID_CREDENTIALS' })
        } else if (!user) {// user not found
            return response.badRequest({ code: 'INVALID_CREDENTIALS' })
        } else if (!(await Hash.verify(user.password, password))) {// check password matches
            return response.badRequest({ code: 'INVALID_CREDENTIALS' })
        } else if (!(user.status === 'active' || user.status === 'deleted')) {// check account is active or deleted
            return response.badRequest({ code: 'ACCOUNT_NOT_ACTIVE' })
        }
        
        // authenticate user
        const { token } = await auth.use('api').generate(user)

        // preload user relations
        await user.load(User.ownerPreloader)
        
        // update last login at
        await user.session.merge({ loginAt: DateTime.now()}).save()

        response.ok({
            token,
            user: user.serializeOwner(),
        })
    }


    /**
     * Sign out
     * @get authentication/sign-out
     * @middleware Auth
     * @success 200 {}
     * @error 401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async signOut({ auth, response }: HttpContextContract) {
        await auth.use('api').revoke()
        response.noContent()
    }


    /**
     * Email token
     * @get authentication/email/:token
     * @query token: string
     * @success 200 { user: UserOwner, token: string }
     * @error 400 VALIDATION_FAILURE | INVALID_TOKEN
     */
    public async emailToken({ auth, request, response }: HttpContextContract) {
        const user = await User.findBy('emailToken', request.param('token'))
        if (!user || user.status === 'suspended') {
            return response.badRequest({ code: 'INVALID_TOKEN' })
        }

        // unique email validation
        if(await User.findBy('email', user.pendingEmail)) {
            return response.badRequest({ code: 'VALIDATION_FAILURE', errors: [{ field: 'email', rule: 'unique' } ] })
        }

        // update model
        await user.merge({
            status: user.status === 'pending' ? 'active' : user.status,
            email: user.pendingEmail, 
            pendingEmail: '', 
            emailToken: ''
        }).save()

        // Authenticate user
        const { token } = await auth.use('api').generate(user)

        // preload user relations
        await user.load(User.ownerPreloader)

        // update last login at
        await user.session.merge({ loginAt: DateTime.now()}).save()

        response.ok({
            token,
            user: user.serializeOwner(),
        })
    }


    /**
     * Recover password
     * @post authentication/recover-password
     * @body { email: string }
     * @success 204 
     * ***      200 { authenticationToken: string } in development
     * @error 400 VALIDATION_FAILURE | INVALID_CREDENTIALS | ACCOUNT_NOT_ACTIVE | TOO_MUCH_REQUEST
     */
    public async recoverPassword({ request, response }: HttpContextContract) {
        const { email } = await request.validate(RecoverPasswordValidator)
        const user = await User.findBy('email', email)
        if (!user) {
            return response.badRequest({ code: 'INVALID_CREDENTIALS' })
        } else if (user.status !== 'active') {// check account is active
            return response.badRequest({ code: 'ACCOUNT_NOT_ACTIVE' })
        } else if (!development && user.recoverPassword && DateTime.now().diff(user.recoverPassword, 'minutes').minutes < 60) {
            return response.badRequest({ code: 'TOO_MUCH_REQUEST', nextRequest: user.recoverPassword.plus({ minutes: 60 }) })
        }

        // generate and save recover password token
        const authenticationToken = tokenGenerate()
        const link = frontendConfig.mail.recoverPassword + authenticationToken
        await user.merge({
            authenticationToken,
            recoverPassword: DateTime.now(),// Avoid too many requests (1 by 60 minutes)
        }).save()
        await new RecoverPasswordMailer({ user, link }).send()

        return development ? response.ok({ authenticationToken }) : response.noContent()
    }


    /**
     * Token
     * @get authentication/token/:token
     * @query { token: string }
     * @success 200 { user: UserOwner, token: string }
     * @error 400 ACCOUNT_NOT_VALIDATED | INVALID_TOKEN
     */
    public async token({ auth, request, response }: HttpContextContract) {
        const user = await User.findBy('authenticationToken', request.param('token'))
        if (!user) {
            return response.badRequest({ code: 'INVALID_TOKEN'})
        } else if (user.status !== 'active') {
            return response.badRequest({ code: 'ACCOUNT_NOT_VALIDATED' })
        }

        // remove pasword token
        await user.merge({ authenticationToken: '' }).save()

        // Authenticate user
        const { token } = await auth.use('api').generate(user)

        // preload user relations
        await user.load(User.ownerPreloader)

        // update last login at
        await user.session.merge({ loginAt: DateTime.now()}).save()

        response.ok({
            token,
            user: user.serializeOwner(),
        })
    }


    /**
     * Session meta update
     * @put authentication/session/meta
     * @middleware auth
     * @body { Partial<UserSessionMeta> }
     * @success 200 { user: UserOwner }
     * @error 400 VALIDATION_FAILURE
     * ***    401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async sessionMetaUpdate({ auth, request, response }: HttpContextContract) {
        const user = auth.use('api').user as User
        const meta = await request.validate(MetaValidator)

        // preload user relations
        await user.load(User.ownerPreloader)

        // update session meta
        await user.session.merge({ 
            meta: {
                ...user.session.meta, 
                ...meta
            }
        }).save()

        response.ok({
            user: user.serializeOwner(),
        })
    }


    /**
     * Update
     * @put authentication
     * @middleware auth
     * @body { username?: string, email?: string, password?: string }
     * @success 200 { user: UserOwner }
     * @error 400 VALIDATION_FAILURE
     * ***    401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async update({ auth, request, response }: HttpContextContract) {
        const user = auth.use('api').user as User
        const data = await request.validate(UpdateValidator)

        // username update
        if (data.username && data.username !== user.username) {
            if(await User.findBy('username', data.username)) {// unique
                return response.badRequest({ code: 'VALIDATION_FAILURE', errors: [{ field: 'username', rule: 'unique' } ] })
            }
            user.merge({ username: data.username })
        }

        // email update
        if (data.email && data.email !== user.email) {
            if(await User.findBy('email', data.email)) {// unique
                return response.badRequest({ code: 'VALIDATION_FAILURE', errors: [{ field: 'email', rule: 'unique' } ] })
            }
            const emailToken = tokenGenerate()
            const link = frontendConfig.mail.emailValidation + emailToken
            user.merge({ pendingEmail: data.email.toLowerCase(), emailToken })
            await new EmailValidationMailer({ user, link }).send()
        }

        // password update
        if (data.password && !(await Hash.verify(user.password, data.password))) {
            user.merge({ password: data.password })
            const token = auth.use('api').token?.tokenHash as string
            await ApiToken.query()// clear other session
                .where('userId', user.id)
                .andWhereNot('token', token)
                .delete()
        }

        // update model
        await user.save()

        // preload user relations
        await user.load(User.ownerPreloader)

        response.ok({
            user: user.serializeOwner(),
        })
    }


    /**
     * Profile update
     * @put authentication/profile
     * @middleware auth
     * @body Partial<UserProfile>
     * @success 200 { user: UserOwner }
     * @error 400 VALIDATION_FAILURE
     * ***    401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async profile({ auth, request, response }: HttpContextContract) {
        const user = auth.use('api').user as User
        const data = await request.validate(ProfileValidator)

        // preload user relations
        await user.load(User.ownerPreloader)

        // update user profile
        await user.profile.merge(data).save()

        response.ok({
            user: user.serializeOwner(),
        })
    }


    /**
     * Profile avatar upload
     * @middleware auth
     * @put authentication/profile/avatar
     * @body { avatar: MultipartFile }
     * @success 200 { user: UserOwner }
     * @error 400 VALIDATION_FAILURE
     * ***    401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async profileAvatarUpload({ auth, request, response }: HttpContextContract) {
        const user = auth.use('api').user as User
        const { avatar } = await request.validate(AvatarValidator)
        
        // preload user relations
        await user.load(User.ownerPreloader)
        
        // delete old avatar
        user.profile.avatarFile && await Drive.delete(user.profile.avatarFile)

        // upload new avatar
        const avatarFileName = cuid() + '.' + avatar.extname 
        await avatar.moveToDisk(foldersConfig.usersAvatars, { 
            name: avatarFileName
        })

        // update model
        const avatarFilePath = [ foldersConfig.usersAvatars, avatarFileName ].join('/')
        user.profile.merge({
            avatar: await Drive.getSignedUrl(avatarFilePath),
            avatarFile: avatarFilePath,
        }).save()

        response.ok({
            user: user.serializeOwner(),
        })
    }


    /**
     * Profile avatar delete
     * @delete authentication/profile/avatar
     * @middleware auth
     * @success 200 { user: UserOwner }
     * @error 401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async profileAvatarDelete({ auth, response }: HttpContextContract) {
        const user = auth.use('api').user as User

        // preload user relations
        await user.load(User.ownerPreloader)
        
        // delete avatar and merge model
        user.profile.avatarFile && await Drive.delete(user.profile.avatarFile)
        await user.profile.merge({ avatar: '' }).save()

        response.ok({
            user: user.serializeOwner(),
        })
    }


    /**
     * Delete
     * @delete authentication/
     * @middleware auth
     * @success 200 { user: UserOwner }
     * @error 401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async delete({ auth, response }: HttpContextContract) {
        const user = auth.use('api').user as User

        // preload user relations
        await user.load(User.ownerPreloader)
        
        // update user status to deleted
        await user.merge({
            status: 'deleted',
            deletedAt: DateTime.now(),
        }).save()

        response.ok({
            user: user.serializeOwner()
        })
    }


    /**
     * Delete
     * @put authentication/recover
     * @middleware auth
     * @success 200 { user: UserOwner }
     * @error 401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async recover({ auth, response }: HttpContextContract) {
        const user = auth.use('api').user as User

        // preload user relations
        await user.load(User.ownerPreloader)
        
        // update user status to active
        await user.merge({
            status: 'active',
            deletedAt: null,
        }).save()

        response.ok({
            user: user.serializeOwner()
        })
    }

}
