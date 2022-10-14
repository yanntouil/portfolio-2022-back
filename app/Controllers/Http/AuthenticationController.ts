import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Application from '@ioc:Adonis/Core/Application'
import Env from '@ioc:Adonis/Core/Env'
import Hash from '@ioc:Adonis/Core/Hash'
import { DateTime } from 'luxon'
import fs from 'fs/promises'
import { tokenGenerate } from 'App/Helpers/token'
import User, { userOwner } from 'App/Models/User'
import ApiToken from 'App/Models/ApiToken'
import RegisterValidator from 'App/Validators/Authentication/RegisterValidator'
import RegistrerMailer from 'App/Mailers/Authentication/Register'
import SignInValidator from 'App/Validators/Authentication/SignInValidator'
import RecoverPasswordValidator from 'App/Validators/Authentication/RecoverPasswordValidator'
import RecoverPasswordMailer from 'App/Mailers/Authentication/RecoverPassword'
import MetaValidator from 'App/Validators/Authentication/MetaValidator'
import UpdateValidator from 'App/Validators/Authentication/UpdateValidator'
import EmailValidationMailer from 'App/Mailers/Authentication/EmailValidation'
import ProfileValidator from 'App/Validators/Authentication/ProfileValidator'
import AvatarValidator from 'App/Validators/Authentication/AvatarValidator'

const development = Env.get('NODE_ENV') === 'development'
const profileAvatarFolder = 'uploads/profile/avatar'


import { cuid } from '@ioc:Adonis/Core/Helpers'

/**
 * Authentication controller
 */
export default class AuthenticationController {

    /**
     * Session
     * @silentAuth
     * @get authentication/
     * @success 200 { session: true, user: UserOwner } | { session: false }
     */
    public async session({ auth, response }: HttpContextContract) {
        const user = auth.use('api').user as User
        if (!user) {
            return response.ok({ session: false })
        }
        await user.load('session')
        await user.load('profile')
        response.ok({ 
            session: true, 
            user: userOwner(user),
        })
    }


    /**
     * Registrer
     * @post authentication/register
     * @body { username: string, email: string, password: string }
     * @success 200 {}
     * @error 400 VALIDATION_FAILURE
     */
     public async register({ request, response }: HttpContextContract) {
        const { username, password, email } = await request.validate(RegisterValidator)

        const emailToken = tokenGenerate()
        const link = Env.get('FRONTEND_REGISTER_VALIDATION') + emailToken
        const user = await User.create({
            username,
            password,
            pendingEmail: email.toLowerCase(),
            emailToken,
        })

        await new RegistrerMailer({ user, link }).send()

        return development ? response.ok({ emailToken }) : response.ok({})
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
        const user = await User.findBy(
            username ? 'username' : 'email',
            username ? username : email
        )
        if (!user) {
            if (await User.findBy('pendingEmail', email)) {// check email is not validated
                return response.badRequest({ code: 'EMAIL_NOT_VALIDATED' })
            }
            return response.badRequest({ code: 'INVALID_CREDENTIALS' })
        }
        if (!(await Hash.verify(user.password, password))) {// check password matches
            return response.badRequest({ code: 'INVALID_CREDENTIALS' })
        }
        if (user.status !== 'active') {// check account is active
            return response.badRequest({ code: 'ACCOUNT_NOT_ACTIVE' })
        }
        
        const { token } = await auth.use('api').generate(user)// Create token
        await user.load('session')
        await user.session.merge({ loginAt: DateTime.now()}).save()// update last login at
        await user.load('profile')

        response.ok({
            token,
            user: userOwner(user),
        })
    }


    /**
     * Sign out
     * @auth
     * @get authentication/sign-out
     * @success 200 {}
     * @error 401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async signOut({ auth, response }: HttpContextContract) {
        await auth.use('api').revoke()
        response.ok({})
    }


    /**
     * Email token
     * Valid an email token
     * @get authentication/email/:token
     * @query token: number
     * @success 200 { user: UserOwner, token: string }
     * @error 400 INVALID_TOKEN
     */
    public async emailToken({ auth, request, response }: HttpContextContract) {
        const user = await User.findBy('emailToken', request.param('token'))
        if (!user) {
            return response.badRequest({ code: 'INVALID_TOKEN' })
        }

        await user.merge({
            status: 'active', 
            email: user.pendingEmail || user.email, 
            pendingEmail: '', 
            emailToken: ''
        }).save()

        const { token } = await auth.use('api').generate(user)// Create token
        await user.load('session')
        await user.session.merge({ loginAt: DateTime.now()}).save()// update last login at
        await user.load('profile')

        response.ok({
            token,
            user: userOwner(user),
        })
    }


    /**
     * Recover password
     * @post authentication/recover-password
     * @body { email: string }
     * @success 200 {}
     * @error 400 VALIDATION_FAILURE | INVALID_CREDENTIALS | ACCOUNT_NOT_ACTIVE | TOO_MUCH_REQUEST
     */
    public async recoverPassword({ request, response }: HttpContextContract) {
        const { email } = await request.validate(RecoverPasswordValidator)
        const user = await User.findBy('email', email)
        if (!user) {
            return response.badRequest({ code: 'INVALID_CREDENTIALS' })
        }
        if (user.status !== 'active') {// check account is active
            return response.badRequest({ code: 'ACCOUNT_NOT_ACTIVE' })
        }
        if (!development && user.recoverPassword && DateTime.now().diff(user.recoverPassword, 'minutes').minutes < 60) {// Avoid too many requests (1 by 60 minutes)
            return response.badRequest({ code: 'TOO_MUCH_REQUEST', nextRequest: user.recoverPassword.plus({ minutes: 60 }) })
        }

        const authenticationToken = tokenGenerate()
        const link = Env.get('FRONTEND_PASSWORD_VALIDATION') + authenticationToken
        await user.merge({
            authenticationToken,
            recoverPassword: DateTime.now(),
        }).save()
        await new RecoverPasswordMailer({ user, link }).send()
        return development ? response.ok({ authenticationToken }) : response.ok({})
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
        }
        if (user.status !== 'active') {
            return response.badRequest({ code: 'ACCOUNT_NOT_VALIDATED' })
        }

        await user.merge({ authenticationToken: '' }).save()// clear authenticationToken
        const { token } = await auth.use('api').generate(user)// create token
        await user.load('session')
        await user.session.merge({ loginAt: DateTime.now()}).save()// update last login at
        await user.load('profile')

        response.ok({
            token,
            user: userOwner(user),
        })
    }


    /**
     * Session meta update
     * @auth
     * @put authentication/session/meta
     * @body { Partial<UserSessionMeta> }
     * @success 200 { user: UserOwner }
     * @error 400 VALIDATION_FAILURE
     *        401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async sessionMetaUpdate({ auth, request, response }: HttpContextContract) {
        const user = auth.use('api').user as User
        const meta = await request.validate(MetaValidator)

        await user.load('session')
        await user.session.merge({ meta: {...user.session.meta, ...meta}}).save()
        await user.load('profile')

        response.ok({
            user: userOwner(user),
        })
    }


    /**
     * Update
     * @auth
     * @put authentication
     * @body { username?: string, email?: string, password?: string }
     * @success 200 { user: UserOwner }
     * @error 400 VALIDATION_FAILURE
     *        401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async update({ auth, request, response }: HttpContextContract) {
        const user = auth.use('api').user as User
        const data = await request.validate(UpdateValidator)

        if (data.username && data.username !== user.username) {// username update
            if(await User.findBy('username', data.username)) {// unique
                return response.badRequest({ code: 'VALIDATION_FAILURE', errors: [{ field: 'username', rule: 'unique' } ] })
            }
            user.merge({ username: data.username })
        }

        if (data.email && data.email !== user.email) {// email update
            if(await User.findBy('email', data.email)) {// unique
                return response.badRequest({ code: 'VALIDATION_FAILURE', errors: [{ field: 'email', rule: 'unique' } ] })
            }
            const emailToken = tokenGenerate()
            const link = Env.get('FRONTEND_EMAIL_VALIDATION') + emailToken
            user.merge({ pendingEmail: data.email.toLowerCase(), emailToken })
            await new EmailValidationMailer({ user, link }).send()
        }

        if (data.password && !(await Hash.verify(user.password, data.password))) {// password update
            user.merge({ password: data.password })
            const token = auth.use('api').token?.tokenHash as string
            await ApiToken.query()// clear other session
                .where('userId', user.id)
                .andWhereNot('token', token)
                .delete()
        }
        await user.save()

        await user.load('session')
        await user.load('profile')

        response.ok({
            user: userOwner(user),
        })
    }


    /**
     * Profile update
     * @auth
     * @put authentication/profile
     * @body Partial<UserProfile>
     * @success 200 { user: UserOwner }
     * @error 400 VALIDATION_FAILURE
     *        401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async profile({ auth, request, response }: HttpContextContract) {
        const user = auth.use('api').user as User
        const data = await request.validate(ProfileValidator)

        await user.load('session')
        await user.load('profile')
        await user.profile.merge(data).save()

        response.ok({
            user: userOwner(user),
        })
    }


    /**
     * Profile avatar upload
     * @auth
     * @put authentication/profile/avatar
     * @body { avatar: MultipartFile }
     * @success 200 { user: UserOwner }
     * @error 400 VALIDATION_FAILURE
     *        401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async profileAvatarUpload({ auth, request, response }: HttpContextContract) {
        const user = auth.use('api').user as User
        const { avatar } = await request.validate(AvatarValidator)
        const avatarId = cuid()
        await avatar.move(Application.publicPath(profileAvatarFolder), { 
            name: avatarId + '.' + avatar.extname 
        })
        
        await user.load('session')
        await user.load('profile')
        await fs.rm(Application.publicPath(profileAvatarFolder, user.profile.avatar))
        await user.profile.merge({ 
            avatar: avatarId + '.' + avatar.extname 
        }).save()

        response.ok({
            user: userOwner(user),
        })
    }


    /**
     * Profile avatar delete
     * @auth
     * @delete authentication/profile/avatar
     * @success 200 { user: UserOwner }
     * @error 401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     */
    public async profileAvatarDelete({ auth, response }: HttpContextContract) {
        const user = auth.use('api').user as User
        await user.load('session')
        await user.load('profile')
        await fs.rm(Application.publicPath(profileAvatarFolder, user.profile.avatar))
        await user.profile.merge({ 
            avatar: ''
        }).save()

        response.ok({
            user: userOwner(user),
        })
    }
}
