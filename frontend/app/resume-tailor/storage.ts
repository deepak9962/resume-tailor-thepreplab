import type { TailorResponse } from './types'

const STORAGE_KEY = 'resume-tailor:last-result'

const isBrowser = (): boolean => typeof window !== 'undefined'

const parse = (raw: string | null): TailorResponse | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as TailorResponse
    if (!parsed?.token || !parsed.result?.customizedResume || !parsed.result?.analysis) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

let cachedRaw: string | null = null
let cachedValue: TailorResponse | null = null
const listeners = new Set<() => void>()

const emit = (): void => {
  for (const listener of listeners) listener()
}

const invalidate = (): void => {
  cachedRaw = null
  cachedValue = null
}

export const saveLastTailorResult = (response: TailorResponse): void => {
  if (!isBrowser()) return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(response))
  } catch {
    return
  }
  invalidate()
  emit()
}

export const clearLastTailorResult = (): void => {
  if (!isBrowser()) return
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    return
  }
  invalidate()
  emit()
}

export const subscribeLastTailorResult = (listener: () => void): (() => void) => {
  listeners.add(listener)
  if (isBrowser()) window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    if (isBrowser()) window.removeEventListener('storage', listener)
  }
}

export const getLastTailorResult = (): TailorResponse | null => {
  if (!isBrowser()) return null
  const raw = window.sessionStorage.getItem(STORAGE_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedValue = parse(raw)
  }
  return cachedValue
}

export const getServerLastTailorResult = (): TailorResponse | null => null
