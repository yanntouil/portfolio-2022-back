import crypto from 'crypto'
import { cuid } from '@ioc:Adonis/Core/Helpers'

export const tokenGenerate = (length: number = 32,): string => cuid() + crypto.randomBytes(length).toString("hex")
