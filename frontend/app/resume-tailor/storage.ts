import type { CoverLetterResponse, TailorResponse } from './types'

const TAILOR_KEY = 'resume-tailor:last-result'
const COVER_LETTER_KEY = 'resume-tailor:last-cover-letter'

const isBrowser = (): boolean => typeof window !== 'undefined'

interface ExternalStore<T> {
  save: (value: T) => void
  clear: () => void
  subscribe: (listener: () => void) => () => void
  get: () => T | null
  getServer: () => null
}

const createExternalStore = <T>(
  key: string,
  isValid: (value: unknown) => value is T,
): ExternalStore<T> => {
  const listeners = new Set<() => void>()
  let cachedRaw: string | null = null
  let cachedValue: T | null = null

  const emit = (): void => {
    for (const listener of listeners) listener()
  }

  const invalidate = (): void => {
    cachedRaw = null
    cachedValue = null
  }

  const parse = (raw: string | null): T | null => {
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as unknown
      return isValid(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  return {
    save: (value) => {
      if (!isBrowser()) return
      try {
        window.sessionStorage.setItem(key, JSON.stringify(value))
      } catch {
        return
      }
      invalidate()
      emit()
    },
    clear: () => {
      if (!isBrowser()) return
      try {
        window.sessionStorage.removeItem(key)
      } catch {
        return
      }
      invalidate()
      emit()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      if (isBrowser()) window.addEventListener('storage', listener)
      return () => {
        listeners.delete(listener)
        if (isBrowser()) window.removeEventListener('storage', listener)
      }
    },
    get: () => {
      if (!isBrowser()) return null
      const raw = window.sessionStorage.getItem(key)
      if (raw !== cachedRaw) {
        cachedRaw = raw
        cachedValue = parse(raw)
      }
      return cachedValue
    },
    getServer: () => null,
  }
}

const isTailorResponse = (value: unknown): value is TailorResponse => {
  const response = value as TailorResponse
  return Boolean(response?.token && response.result?.customizedResume && response.result?.analysis)
}

const isCoverLetterResponse = (value: unknown): value is CoverLetterResponse => {
  const response = value as CoverLetterResponse
  return Boolean(response?.token && response.result?.coverLetter && response.result?.analysis)
}

const tailorStore = createExternalStore<TailorResponse>(TAILOR_KEY, isTailorResponse)
const coverLetterStore = createExternalStore<CoverLetterResponse>(
  COVER_LETTER_KEY,
  isCoverLetterResponse,
)

export const saveLastTailorResult = tailorStore.save
export const clearLastTailorResult = tailorStore.clear
export const subscribeLastTailorResult = tailorStore.subscribe
export const getLastTailorResult = tailorStore.get
export const getServerLastTailorResult = tailorStore.getServer

export const saveLastCoverLetter = coverLetterStore.save
export const clearLastCoverLetter = coverLetterStore.clear
export const subscribeLastCoverLetter = coverLetterStore.subscribe
export const getLastCoverLetter = coverLetterStore.get
export const getServerLastCoverLetter = coverLetterStore.getServer
