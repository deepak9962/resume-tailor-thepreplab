import { randomUUID } from 'node:crypto'
import { config } from '../lib/config.js'

interface StoredFile {
  buffer: Buffer
  expiresAt: number
}

const store = new Map<string, StoredFile>()

const sweep = () => {
  const now = Date.now()
  for (const [token, file] of store) {
    if (file.expiresAt <= now) {
      store.delete(token)
    }
  }
}

const sweepTimer = setInterval(sweep, 60_000)
sweepTimer.unref()

export interface StoredDownload {
  token: string
  expiresAt: number
}

export const save = (buffer: Buffer): StoredDownload => {
  const token = randomUUID()
  const expiresAt = Date.now() + config.DOWNLOAD_TTL_MS
  store.set(token, { buffer, expiresAt })
  return { token, expiresAt }
}

export type GetResult =
  | { status: 'found'; buffer: Buffer }
  | { status: 'expired' }
  | { status: 'missing' }

export const get = (token: string): GetResult => {
  const file = store.get(token)
  if (!file) {
    return { status: 'missing' }
  }
  if (file.expiresAt <= Date.now()) {
    store.delete(token)
    return { status: 'expired' }
  }
  return { status: 'found', buffer: file.buffer }
}

export const stopSweeper = () => {
  clearInterval(sweepTimer)
}
