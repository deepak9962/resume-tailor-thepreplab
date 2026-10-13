import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  PORT: z.coerce.number().int().positive().default(3001),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5),
  MIN_JD_LENGTH: z.coerce.number().int().positive().default(100),
  MAX_JD_LENGTH: z.coerce.number().int().positive().default(6_000),
  MAX_RESUME_TEXT_LENGTH: z.coerce.number().int().positive().default(20_000),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  DOWNLOAD_TTL_MS: z.coerce.number().int().positive().default(300_000),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  console.error(`Invalid environment configuration:\n${details}`)
  process.exit(1)
}

export const config = {
  ...parsed.data,
  maxFileSizeBytes: parsed.data.MAX_FILE_SIZE_MB * 1024 * 1024,
  geminiModel: parsed.data.GEMINI_MODEL,
} as const
