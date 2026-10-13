import { afterEach, describe, expect, it, vi } from 'vitest'
import * as tokenStore from './tokenStore.js'
import type { TailorContext } from './tokenStore.js'

const context: TailorContext = {
  jobDescription: 'a long enough job description',
  resumeText: 'resume text',
  resume: {
    name: 'Jane Doe',
    title: '',
    contact: '',
    summary: '',
    skills: [],
    experience: [],
    projects: [],
    education: [],
    other: [],
  },
}

afterEach(() => {
  vi.useRealTimers()
})

describe('tokenStore', () => {
  it('stores a buffer and returns a future expiry', () => {
    const buffer = Buffer.from('tailored resume')
    const { token, expiresAt } = tokenStore.save(buffer)

    expect(token).toBeTruthy()
    expect(expiresAt).toBeGreaterThan(Date.now())

    const result = tokenStore.get(token)
    expect(result.status).toBe('found')
    if (result.status === 'found') {
      expect(result.buffer.equals(buffer)).toBe(true)
    }
  })

  it('reports unknown tokens as missing', () => {
    expect(tokenStore.get('does-not-exist').status).toBe('missing')
  })

  it('stores and returns the tailoring context', () => {
    const { token } = tokenStore.save(Buffer.from('resume'), context)

    const found = tokenStore.getContext(token)
    expect(found.status).toBe('found')
    if (found.status === 'found') {
      expect(found.context).toEqual(context)
    }
  })

  it('reports a token without context as missing', () => {
    const { token } = tokenStore.save(Buffer.from('resume'))
    expect(tokenStore.getContext(token).status).toBe('missing')
  })

  it('expires the context alongside the download', () => {
    vi.useFakeTimers()
    const { token } = tokenStore.save(Buffer.from('resume'), context)

    vi.advanceTimersByTime(300_001)

    expect(tokenStore.getContext(token).status).toBe('expired')
  })
})

