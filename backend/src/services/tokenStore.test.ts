import { describe, expect, it } from 'vitest'
import * as tokenStore from './tokenStore.js'

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
})
