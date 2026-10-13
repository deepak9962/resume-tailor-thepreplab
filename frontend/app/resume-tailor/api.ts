import type { ApiError, CoverLetterOptions, CoverLetterResponse, TailorResponse } from './types'

export const MIN_JD_LENGTH = 100
export const MAX_JD_LENGTH = 6000
export const COVER_LETTER_LIMITS = {
  companyName: 120,
  roleTitle: 120,
  candidateNotes: 2000,
} as const
export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx']
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const getApiBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL is not set. Add it to your environment.')
  }
  return url.replace(/\/+$/, '')
}

const REQUEST_TIMEOUT_MS = 180_000

const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  (error as { name?: unknown }).name === 'AbortError'

const fetchWithTimeout = async (url: string, init: RequestInit): Promise<Response> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: ApiError }
    if (body.error?.message) {
      return body.error.message
    }
  } catch {
    // Non-JSON error body; fall back to a generic message.
  }
  return 'Something went wrong while tailoring your resume. Please try again.'
}

export const tailorResume = async (
  jobDescription: string,
  resume: File,
): Promise<TailorResponse> => {
  const formData = new FormData()
  formData.append('jobDescription', jobDescription)
  formData.append('resume', resume)

  let response: Response
  try {
    response = await fetchWithTimeout(`${getApiBaseUrl()}/resume-tailor`, {
      method: 'POST',
      body: formData,
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('This is taking longer than expected. Please try again.')
    }
    throw new Error('Could not reach the tailoring service. Check your connection and try again.')
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as TailorResponse
}

export const downloadUrl = (token: string): string => `${getApiBaseUrl()}/download/${token}`

const trimOrUndefined = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export const generateCoverLetter = async (
  token: string,
  options: CoverLetterOptions,
): Promise<CoverLetterResponse> => {
  const payload = {
    token,
    companyName: trimOrUndefined(options.companyName),
    roleTitle: trimOrUndefined(options.roleTitle),
    candidateNotes: trimOrUndefined(options.candidateNotes),
    tone: options.tone,
  }

  let response: Response
  try {
    response = await fetchWithTimeout(`${getApiBaseUrl()}/cover-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('This is taking longer than expected. Please try again.')
    }
    throw new Error('Could not reach the cover letter service. Check your connection and try again.')
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as CoverLetterResponse
}
