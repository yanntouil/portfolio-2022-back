/*
|--------------------------------------------------------------------------
| Http Exception Handler
|--------------------------------------------------------------------------
|
| AdonisJs will forward all exceptions occurred during an HTTP request to
| the following class. You can learn more about exception handling by
| reading docs.
|
| The exception handler extends a base `HttpExceptionHandler` which is not
| mandatory, however it can do lot of heavy lifting to handle the errors
| properly.
|
*/

import Logger from '@ioc:Adonis/Core/Logger'
import Env from '@ioc:Adonis/Core/Env'
import HttpExceptionHandler from '@ioc:Adonis/Core/HttpExceptionHandler'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

const development = Env.get('NODE_ENV') === 'development'

export default class ExceptionHandler extends HttpExceptionHandler {
    constructor () {
        super(Logger)
    }
    public async handle(error: any, ctx: HttpContextContract) {
        development && this.logger.error('handle error')
        
        /**
         * E_VALIDATION_FAILURE
         */
        if (error.code === 'E_VALIDATION_FAILURE') {
            return ctx.response.status(400).send({
              code: 'VALIDATION_FAILURE',
              errors: error.messages.errors.map(e => ({ field: e.field, rule: e.rule })),
            })
        }
    }
}
