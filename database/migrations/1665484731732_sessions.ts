import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'sessions'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('login_at', { useTz: true }).nullable()
      table.json('meta').notNullable().defaultTo({})

    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
