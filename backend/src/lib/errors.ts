export class AppError extends Error {
  readonly statusCode: number
  readonly code: string

  constructor(statusCode: number, code: string, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
  }
}

export const badRequest = (message: string) => new AppError(400, 'BAD_REQUEST', message)
export const unsupportedType = (message: string) =>
  new AppError(415, 'UNSUPPORTED_FILE_TYPE', message)
export const payloadTooLarge = (message: string) =>
  new AppError(413, 'PAYLOAD_TOO_LARGE', message)
export const llmFailure = (message: string, cause?: unknown) =>
  new AppError(502, 'LLM_FAILURE', message, { cause })
