import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { pick } from 'ramda'
import User from 'App/Models/User'
import AdminCreateValidator from 'App/Validators/Users/AdminCreateValidator'
import AdminUpdateValidator from 'App/Validators/Users/AdminUpdateValidator'
import ApiToken from 'App/Models/ApiToken'
import Drive from '@ioc:Adonis/Core/Drive'
import AvatarValidator from 'App/Validators/Authentication/AvatarValidator'
import foldersConfig from 'Config/folders'
import AccountDeletionMailer from 'App/Mailers/Admin/Users/AccountDeletion'
import AccountSuspensionMailer from 'App/Mailers/Admin/Users/AccountSuspension'
import AccountCreationMailer from 'App/Mailers/Admin/Users/AccountCreation'
import EmailValidationMailer from 'App/Mailers/Admin/Users/EmailValidation'
import { tokenGenerate } from 'App/Helpers/token'
import AdminSuspendValidator from 'App/Validators/Users/AdminSuspendValidator'
import frontendConfig from 'Config/frontend'



/**
 * Admin Users Controller
 * Todo
 * - mettre en place une messagerie pour géré les négociations suite au suspension
 * - mettre en place une route de maintenance permettant de nettoyer les comptes supprimés, suspendus et en attente
 *      - supprimés: 30j après la suppression du compte 
 *      - suspendus: 30j après le dernier message
 *      - attente: 30j après l'inscription
 */
export default class AdminUsersController {

    /**
     * Index
     * @get admin/users
     * @middleware auth admin
     * @success 200 { users: UserAdmin[] }
     * @error 401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     * ***    403 UNAUTHORIZED_ACCESS
     */
    public async index({ response }: HttpContextContract) {
        const users = await User.query()
            .preload('profile')
            .preload('session')

        response.ok({ 
            users: users.map(user => user.serializeAdmin())
        })
    }


    /**
     * Create
     * @post admin/users
     * @middleware auth admin
     * @body { email: string, password: string, role: UserRole }
     * @success 200 { user: UserAdmin }
     * @error 400 VALIDATION_FAILURE
     * ***    401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     * ***    403 UNAUTHORIZED_ACCESS
     */
    public async create({ request, response }: HttpContextContract) {
        const data = await request.validate(AdminCreateValidator)
        
        // create user
        const emailToken = tokenGenerate()
        const user = await User.create({
            ...pick([ 'username', 'password', 'role' ], data),
            email: '',
            pendingEmail: data.email.toLowerCase(), 
            emailToken,
            status: 'pending',
        })
        await user.refresh()
        
        // preload user relations
        await user.load(User.adminPreloader)

        // send account creation mail
        const link = frontendConfig.mail.admin.emailValidation + emailToken
        await new AccountCreationMailer({ user, message: data.message, link }).sendLater()

        response.ok({ 
            user: user.serializeAdmin()
        })
    }


    /**
     * Read
     * @get admin/users/:userId
     * @middleware auth admin
     * @query userId: Uuid
     * @success 200 { user: UserAdmin }
     * @error 401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     * ***    403 UNAUTHORIZED_ACCESS
     * ***    404 USER_NOT_FOUND
     */
    public async read({ request, response }: HttpContextContract) {
        const user = await User.find(request.param('userId'))
        if(!user) {
            return response.notFound({ code: 'USER_NOT_FOUND' })
        }

        // preload user relations
        await user.load(User.adminPreloader)

        response.ok({ 
            user: user.serializeAdmin()
        })
    }


    /**
     * Update
     * @put admin/users/:userId
     * @middleware auth admin
     * @query userId: Uuid
     * @body { password?: string, ...Partial<Pick<UserAdmin, 'email' | 'role' | 'writer'>>, profile?: ...Partial<Omit<Profile, 'id'>> }
     * @success 200 { user: UserAdmin }
     * @error 400 VALIDATION_FAILURE
     * ***    401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     * ***    403 UNAUTHORIZED_ACCESS
     * ***    404 USER_NOT_FOUND
     */
    public async update({ request, response }: HttpContextContract) {
        const data = await request.validate(AdminUpdateValidator)
        const user = await User.find(request.param('userId'))
        if(!user) {
            return response.notFound({ code: 'USER_NOT_FOUND' })
        }

        // merge model
        user.merge({
            ...pick([ 'username', 'password', 'role' ], data),
        })

        // username update
        if (data.username && data.username !== user.username) {
            if(await User.findBy('username', data.username)) {// unique
                return response.badRequest({ code: 'VALIDATION_FAILURE', errors: [{ field: 'username', rule: 'unique' } ] })
            }
        }

        // email update
        if (data.email && data.email.toLowerCase() !== user.email) {
            if(await User.findBy('email', data.email)) {// unique
                return response.badRequest({ code: 'VALIDATION_FAILURE', errors: [{ field: 'email', rule: 'unique' } ] })
            }
            const emailToken = tokenGenerate()
            const link = frontendConfig.mail.admin.emailValidation + emailToken
            user.merge({ 
                pendingEmail: data.email.toLowerCase(),
                emailToken,
            })
            await new EmailValidationMailer({ user, link }).send()
            await ApiToken.query()// delete authentication session
                .where('userId', user.id)
                .delete()
        }

        // update model
        await user.save()

        // preload user relations
        await user.load(User.adminPreloader)

        // update profile
        data.profile && await user.profile.merge(data.profile).save()

        response.ok({ 
            user: user.serializeAdmin()
        })
    }


    /**
     * Delete
     * @delete admin/users/:userId
     * @middleware auth admin
     * @query userId: Uuid
     * @success 204
     * @error 401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     * ***    403 UNAUTHORIZED_ACCESS
     * ***    404 USER_NOT_FOUND
     */
    public async delete({ request, response }: HttpContextContract) {
        const user = await User.find(request.param('userId'))
        if(!user) {
            return response.notFound({ code: 'USER_NOT_FOUND' })
        }

        // preload user relations
        await user.load(User.adminPreloader)

        // delete related files
        user.profile.avatarFile && await Drive.delete(user.profile.avatarFile)
        
        // delete authentication session
        await ApiToken.query()
            .where('userId', user.id)
            .delete()
        
        // delete user
        await user.delete()

        await new AccountDeletionMailer({ user }).sendLater()
        
        response.noContent()
    }


    /**
     * Suspend
     * @put admin/users/:userId/suspend
     * @middleware auth admin
     * @query userId: Uuid
     * @success 204
     * @error 400 VALIDATION_FAILURE
     * ***    401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     * ***    403 UNAUTHORIZED_ACCESS
     * ***    404 USER_NOT_FOUND
     */
    public async suspend({ request, response }: HttpContextContract) {
        const data = await request.validate(AdminSuspendValidator)
        const user = await User.find(request.param('userId'))
        if(!user) {
            return response.notFound({ code: 'USER_NOT_FOUND' })
        }

        // preload user relations
        await user.load(User.adminPreloader)

        // update user status
        await user.merge({ status: 'suspended' }).save()

        // delete authentication session
        await ApiToken.query()
            .where('userId', user.id)
            .delete()

        // send suspension
        await new AccountSuspensionMailer({ user, ...data }).sendLater()
       
        response.ok({
            user: user.serializeAdmin()
        })
    }


    /**
     * Avatar upload
     * @post admin/users/:userId/profile/avatar
     * @middleware auth admin
     * @query userId: Uuid
     * @body { avatar: MultipartFile }
     * @success 200 { user: UserAdmin }
     * @error 400 VALIDATION_FAILURE
     * ***    401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     * ***    403 UNAUTHORIZED_ACCESS
     * ***    404 USER_NOT_FOUND
     */
    public async profileAvatarUpload({ request, response }: HttpContextContract) {
        const { avatar } = await request.validate(AvatarValidator)
        const user = await User.find(request.param('userId'))
        if(!user) {
            return response.notFound({ code: 'USER_NOT_FOUND' })
        }

        // preload user relations
        await user.load(User.adminPreloader)

        // remove old file
        user.profile.avatarFile && await Drive.delete(user.profile.avatarFile)

        // upload new file
        const avatarFileName = user.id + '.' + avatar.extname
        await avatar.moveToDisk(foldersConfig.usersAvatars, { 
            name: avatarFileName
        })

        // update profile
        const avatarFilePath = [ foldersConfig.usersAvatars, avatarFileName ].join('/')
        user.profile.merge({
            avatar: await Drive.getSignedUrl(avatarFilePath),
            avatarFile: avatarFilePath,
        }).save()
      
        response.ok({
            user: user.serializeAdmin()
        })
    }


    /**
     * Avatar delete
     * @delete admin/users/:userId/profile/avatar
     * @middleware auth admin
     * @query userId: Uuid
     * @success 200 { user: UserAdmin }
     * @error 401 INVALID_API_TOKEN | INVALID_AUTH_SESSION
     * ***    403 UNAUTHORIZED_ACCESS
     * ***    404 USER_NOT_FOUND
     */
    public async profileAvatarDelete({ request, response }: HttpContextContract) {
        const user = await User.find(request.param('userId'))
        if(!user) {
            return response.notFound({ code: 'USER_NOT_FOUND' })
        }

        // preload user relations
        await user.load(User.adminPreloader)

        // remove file
        user.profile.avatarFile && await Drive.delete(user.profile.avatarFile)

        // update profile
        user.profile.merge({
            avatar: '',
            avatarFile: '',
        }).save()

        response.ok({
            user: user.serializeAdmin()
        })
    }
    

}
