import Env from '@ioc:Adonis/Core/Env'





const frontend = Env.get('FRONTEND_URL')


/**
 * Frontend config
 */
const frontendConfig = {
    mail: {
        register: [frontend, ''].join('/'),
        emailValidation: [frontend, ''].join('/'),
        recoverPassword: [frontend, ''].join('/'),
        accountDeletion: [frontend, ''].join('/'),
        mailRequest: [frontend, ''].join('/'),
        admin: {
            accountCreation: [frontend, ''].join('/'),
            emailValidation: [frontend, ''].join('/'),
            accountDeletion: [frontend, ''].join('/'),
            accountSuspension: [frontend, ''].join('/'),
        }
    }

}
export default frontendConfig