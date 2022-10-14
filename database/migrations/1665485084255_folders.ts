import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'folders'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.dateTime('deleted_at').nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
