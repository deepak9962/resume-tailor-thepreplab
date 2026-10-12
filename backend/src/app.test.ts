import { afterEach, describe, expect, it } from 'vitest'
import { buildServer } from './app.js'
import { stopSweeper } from './services/tokenStore.js'

describe('server', () => {
  const apps: Awaited<ReturnType<typeof buildServer>>[] = []

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()))
    apps.length = 0
    stopSweeper()
  })

  it('answers the health check', async () => {
    const app = await buildServer()
    apps.push(app)

    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('returns 404 for an unknown download token', async () => {
    const app = await buildServer()
    apps.push(app)

    const response = await app.inject({ method: 'GET', url: '/download/missing' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Download link not found.' },
    })
  })
})
