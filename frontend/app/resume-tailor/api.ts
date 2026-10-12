import type { ApiError, TailorResponse } from './types'

export const MIN_JD_LENGTH = 100
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
    response = await fetch(`${getApiBaseUrl()}/resume-tailor`, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new Error('Could not reach the tailoring service. Check your connection and try again.')
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as TailorResponse
}

export const downloadUrl = (token: string): string => `${getApiBaseUrl()}/download/${token}`
