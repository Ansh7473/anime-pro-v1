import { handle } from 'hono/netlify'
import app from '../../src/server.js'

export const handler = handle(app)
