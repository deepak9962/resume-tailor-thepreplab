import { GoogleGenAI } from '@google/genai'
import { config } from '../lib/config.js'
import { llmFailure } from '../lib/errors.js'

export const ai = new GoogleGenAI({
  apiKey: config.GEMINI_API_KEY,
  httpOptions: { timeout: 60_000 },
})

const statusOf = (error: unknown): number | undefined => {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status
    return typeof status === 'number' ? status : undefined
  }
  return undefined
}

export const isTransient = (error: unknown): boolean => {
  const status = statusOf(error)
  if (status !== undefined) {
    return status === 429 || status >= 500
  }
  const message = error instanceof Error ? error.message : String(error)
  return /(5\d\d|timeout|timed out|unavailable|overloaded|rate)/i.test(message)
}

export const withRetry = async <T>(
  attempt: () => Promise<T>,
  messages: { failure: string; busy: string },
): Promise<T> => {
  try {
    return await attempt()
  } catch (firstError) {
    if (!isTransient(firstError)) {
      throw llmFailure(messages.failure, firstError)
    }
    try {
      return await attempt()
    } catch (retryError) {
      throw llmFailure(messages.busy, retryError)
    }
  }
}
