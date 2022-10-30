import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { tokenGenerate } from 'App/Helpers/token'
import NewRequestMailer from 'App/Mailers/MailRequests/NewRequest'
import NewMessageMailer from 'App/Mailers/MailRequests/NewMessage'
import MailRequest from 'App/Models/MailRequest'
import CreateAsUserValidator from 'App/Validators/MailRequests/CreateAsUserValidator'
import CreateMessageValidator from 'App/Validators/MailRequests/CreateMessageValidator'
import CreateValidator from 'App/Validators/MailRequests/CreateValidator'
import frontendConfig from 'Config/frontend'
import { pick } from 'ramda'


export default class MailRequestsController {


    /**
     * Create
     * @post api/mail-requests/
     * @middleware silentAuth
     * @body auth { ...Pick<MailRequest, 'subject' | 'message' | 'type' > }
     * *   noauth { ...Pick<MailRequest, 'subject' | 'message' | 'type' | 'username'  | 'email' > }
     * @success 200 { mailRequest: MailRequest, messages: MailRequestMessage[] }
     * @error 400 VALIDATION_FAILURE
     */
    public async create({ auth, request, response }: HttpContextContract) {
        const user = auth.use('api').user
        const data = user ? await request.validate(CreateAsUserValidator) : await request.validate(CreateValidator)

        // create mail request
        const mailRequest = await MailRequest.create({
            ...pick([ 'username', 'email' ], user ?? {}),
            ...pick([ 'username', 'email', 'subject', 'type' ], data),
            token: tokenGenerate(),
            userId: user ? user.id : null,
            status: 'waitingFromAdmin',
        })
        await mailRequest.refresh()

        // create mail request message
        const mailRequestMessage = await mailRequest.related('message').create({
            toUserId: user ? user.id : null,
            toName: mailRequest.username,
            content: data.message,
        })

        // send mail
        const link = frontendConfig.mail.mailRequest + mailRequest.token
        await new NewRequestMailer({ mailRequest, mailRequestMessage, link }).sendLater()

        response.ok({ 
            mailRequest: {
                ...mailRequest.serialize(),
                messages: [ mailRequestMessage.serialize() ],
            },
        })
    }

    /**
     * Create message
     * @post api/mail-requests/:token
     * @body { ...Pick<MailRequestMessage, 'message' > }
     * @success 200 { mailRequest: MailRequest, messages: MailRequestMessage[] }
     * @error 400 VALIDATION_FAILURE | INVALID_TOKEN
     */
     public async createMessage({request, response }: HttpContextContract) {
        const mailRequest = await MailRequest.query()
            .where('token', request.param('token'))
            .preload('user')
            .first()
        if(!mailRequest) {
            return response.badRequest({ code: 'INVALID_TOKEN' })
        }
        const data = await request.validate(CreateMessageValidator)

        // create mail request message
        const mailRequestMessage = await mailRequest.related('message').create({
            toUserId: mailRequest.user ? mailRequest.user.id : null,
            toName:  mailRequest.user ? mailRequest.user.username : mailRequest.username,
            content: data.message,
        })

        // preload mail request messages
        mailRequest.load('message', query => query.orderBy('createdAt'))

        // send mail
        const link = frontendConfig.mail.mailRequest + mailRequest.token
        await new NewMessageMailer({ mailRequest, mailRequestMessage, link }).sendLater()

        response.ok({ 
            mailRequest: mailRequest.serialize(),
        })
    }

}
