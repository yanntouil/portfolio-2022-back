import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'profiles'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')

      table.string('firstname', 255).notNullable().defaultTo('')
      table.string('lastname', 255).notNullable().defaultTo('')
      table.date('dob').nullable().defaultTo(null)

      table.string('address', 255).notNullable().defaultTo('')
      table.string('city', 255).notNullable().defaultTo('')
      table.string('state', 255).notNullable().defaultTo('')
      table.string('zip', 255).notNullable().defaultTo('')
      table.string('country', 255).notNullable().defaultTo('')
      table.string('phone').notNullable().defaultTo('')
      table.string('email').notNullable().defaultTo('')
      table.json('links').notNullable().defaultTo([])
      
      table.string('avatar', 255).nullable().defaultTo('')
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
