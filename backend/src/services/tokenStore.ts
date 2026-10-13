import { randomUUID } from 'node:crypto'
import { config } from '../lib/config.js'
import type { CustomizedResume } from '../schemas/tailorResult.js'

export interface TailorContext {
  jobDescription: string
  resumeText: string
  resume: CustomizedResume
}

interface StoredFile {
  buffer: Buffer
  expiresAt: number
  context?: TailorContext
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

export const save = (buffer: Buffer, context?: TailorContext): StoredDownload => {
  const token = randomUUID()
  const expiresAt = Date.now() + config.DOWNLOAD_TTL_MS
  store.set(token, { buffer, expiresAt, context })
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

export type GetContextResult =
  | { status: 'found'; context: TailorContext }
  | { status: 'expired' }
  | { status: 'missing' }

export const getContext = (token: string): GetContextResult => {
  const file = store.get(token)
  if (!file) {
    return { status: 'missing' }
  }
  if (file.expiresAt <= Date.now()) {
    store.delete(token)
    return { status: 'expired' }
  }
  if (!file.context) {
    return { status: 'missing' }
  }
  return { status: 'found', context: file.context }
}

export const stopSweeper = () => {
  clearInterval(sweepTimer)
}
