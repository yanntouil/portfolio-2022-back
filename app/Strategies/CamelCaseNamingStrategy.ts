import { SnakeCaseNamingStrategy, BaseModel } from '@ioc:Adonis/Lucid/Orm'
import { string } from '@ioc:Adonis/Core/Helpers'

/**
 * Camel case naming strategy
 */
export default class CamelCaseNamingStrategy extends SnakeCaseNamingStrategy {
    public serializedName(_model: typeof BaseModel, propertyName: string) {
        return string.camelCase(propertyName)
    }
}