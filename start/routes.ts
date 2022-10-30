/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'
import View from '@ioc:Adonis/Core/View'

/**
 * Healthcheck
 */
Route.any('/healthcheck', async () => {
  return { message: "I'm in the best of health who i can 😅" }
})


/**
 * Homepage
 */
Route.get('/', async () => {
  return { hello: 'world' }
})
Route.get('/test', async () => {
  return await View.render('emails/authentication/register', { user: {email: 'yann@101.lu', username: 'Yann'}, link: '127.0.0.1/register-validation/a1z1e2e85ds8f4s4198ve4r4g9er1ge'})
})




/**
 * Authentication
 */
Route.group(() => {
  Route.get('/session', 'AuthenticationController.session').middleware(['silentAuth'])
  Route.post('/register', 'AuthenticationController.register')
  Route.post('/sign-in', 'AuthenticationController.signIn')
  Route.get('/sign-out', 'AuthenticationController.signOut').middleware(['auth'])
  Route.get('/email/:token', 'AuthenticationController.emailToken')
  Route.post('/recover-password', 'AuthenticationController.recoverPassword')
  Route.get('/token/:token', 'AuthenticationController.token')
  Route.put('/session/meta', 'AuthenticationController.sessionMetaUpdate').middleware(['auth'])
  Route.put('/', 'AuthenticationController.update').middleware(['auth'])
  Route.delete('/', 'AuthenticationController.delete').middleware(['auth'])
  Route.put('/recover', 'AuthenticationController.recover').middleware(['auth'])
  Route.put('/profile', 'AuthenticationController.profile').middleware(['auth'])
  Route.post('/profile/avatar', 'AuthenticationController.profileAvatarUpload').middleware(['auth'])
  Route.delete('/profile/avatar', 'AuthenticationController.profileAvatarDelete').middleware(['auth'])
})
.prefix('api/authentication')




/**
 * Admin
 */
Route.group(() => {


  /**
   * Users
   */
  Route.group(() => {
    Route.get('/', 'AdminUsersController.index')
    Route.post('/', 'AdminUsersController.create')
    Route.put('/:userId', 'AdminUsersController.update')
    Route.get('/:userId', 'AdminUsersController.read')
    Route.delete('/:userId', 'AdminUsersController.delete')
    Route.put('/:userId/suspend', 'AdminUsersController.suspend')
    Route.post('/:userId/profile/avatar', 'AdminUsersController.profileAvatarUpload')
    Route.delete('/:userId/profile/avatar', 'AdminUsersController.profileAvatarDelete')
  })
  .prefix('/user')
  .where('userId', Route.matchers.uuid())


})
.prefix('api/admin')
.middleware(['auth', 'admin'])


/**
 * Fallback
 */
// Route.any('api/*', async () => {
//   return { error: '404' }
// })
