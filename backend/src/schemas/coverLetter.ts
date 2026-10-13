import { z } from 'zod'

export const coverLetterSchema = z.object({
  greeting: z.string(),
  opening: z.string(),
  bullets: z.array(z.string()),
  closing: z.string(),
  signOff: z.string(),
})

export const evidenceSchema = z.object({
  requirement: z.string(),
  resumeFact: z.string(),
})

export const coverLetterAnalysisSchema = z.object({
  jdPriorities: z.array(z.string()),
  evidenceUsed: z.array(evidenceSchema),
  unsupportedRequirements: z.array(z.string()),
})

export const coverLetterResultSchema = z.object({
  coverLetter: coverLetterSchema,
  analysis: coverLetterAnalysisSchema,
})

export const toneSchema = z.enum(['professional', 'warm', 'direct'])

export const coverLetterRequestSchema = z.object({
  token: z.string().min(1),
  candidateNotes: z.string().optional(),
  companyName: z.string().optional(),
  roleTitle: z.string().optional(),
  tone: toneSchema.optional(),
})

export type CoverLetter = z.infer<typeof coverLetterSchema>
export type CoverLetterEvidence = z.infer<typeof evidenceSchema>
export type CoverLetterAnalysis = z.infer<typeof coverLetterAnalysisSchema>
export type CoverLetterResult = z.infer<typeof coverLetterResultSchema>
export type CoverLetterTone = z.infer<typeof toneSchema>
export type CoverLetterRequest = z.infer<typeof coverLetterRequestSchema>

export const coverLetterJsonSchema = {
  type: 'object',
  properties: {
    coverLetter: {
      type: 'object',
      description: 'The cover letter, using only facts from the resume and candidate notes.',
      properties: {
        greeting: { type: 'string', description: 'For example "Dear Hiring Manager,".' },
        opening: {
          type: 'string',
          description: '2 to 3 sentences: role applied for, experience level, and fit.',
        },
        bullets: {
          type: 'array',
          items: { type: 'string' },
          description: '4 to 6 bullets, each leading with the outcome then the resume proof.',
        },
        closing: {
          type: 'string',
          description: '2 to 3 sentences of genuine interest and an invitation to talk.',
        },
        signOff: {
          type: 'string',
          description: '"Best regards," followed by the candidate name on separate lines.',
        },
      },
      required: ['greeting', 'opening', 'bullets', 'closing', 'signOff'],
    },
    analysis: {
      type: 'object',
      properties: {
        jdPriorities: {
          type: 'array',
          items: { type: 'string' },
          description: 'The 3 to 5 JD requirements the letter focused on.',
        },
        evidenceUsed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              requirement: { type: 'string' },
              resumeFact: { type: 'string' },
            },
            required: ['requirement', 'resumeFact'],
          },
          description: 'For each priority, the true resume fact used to support it.',
        },
        unsupportedRequirements: {
          type: 'array',
          items: { type: 'string' },
          description: 'Important JD requirements the resume does not support and were left out.',
        },
      },
      required: ['jdPriorities', 'evidenceUsed', 'unsupportedRequirements'],
    },
  },
  required: ['coverLetter', 'analysis'],
} as const
