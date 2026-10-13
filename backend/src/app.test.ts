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

  it('allows CORS requests from each configured origin', async () => {
    const app = await buildServer()
    apps.push(app)

    for (const origin of ['http://localhost:3000', 'https://prod.example.com']) {
      const response = await app.inject({ method: 'GET', url: '/health', headers: { origin } })
      expect(response.statusCode).toBe(200)
      expect(response.headers['access-control-allow-origin']).toBe(origin)
    }
  })

  it('does not allow CORS requests from an unknown origin', async () => {
    const app = await buildServer()
    apps.push(app)

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example.com' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
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

  it('rejects a job description over the maximum length', async () => {
    const app = await buildServer()
    apps.push(app)

    const boundary = '----resumetailortest'
    const body =
      `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="jobDescription"\r\n\r\n' +
      `${'a'.repeat(6_001)}\r\n` +
      `--${boundary}--\r\n`

    const response = await app.inject({
      method: 'POST',
      url: '/resume-tailor',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: { code: 'BAD_REQUEST' } })
  })

  it('rejects a cover letter request without a token', async () => {
    const app = await buildServer()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/cover-letter',
      payload: { tone: 'warm' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: { code: 'BAD_REQUEST' } })
  })

  it('returns 404 for an unknown cover letter token', async () => {
    const app = await buildServer()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/cover-letter',
      payload: { token: 'missing' },
    })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Tailoring session not found. Please tailor the resume again.',
      },
    })
  })
})
