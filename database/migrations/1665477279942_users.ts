import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class UsersSchema extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.string('username', 255).notNullable()

      table.string('password', 180).notNullable()
      table.text('authentication_token').nullable()
      table.dateTime('recover_password').nullable()

      table.string('email', 255).nullable()
      table.string('pending_email', 255).nullable()
      table.text('email_token').nullable()

      table.enum('status', ['pending', 'active', 'deleted', 'suspended']).defaultTo('pending')

      table.string('remember_me_token').nullable()

      table.enum('role', ['member', 'writer', 'admin']).defaultTo('member')

      table.dateTime('deleted_at').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
