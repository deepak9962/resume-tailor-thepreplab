import { z } from 'zod'

export const skillGroupSchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
})

export const experienceItemSchema = z.object({
  role: z.string(),
  company: z.string(),
  dates: z.string(),
  bullets: z.array(z.string()),
})

export const projectItemSchema = z.object({
  name: z.string(),
  tech: z.string(),
  bullets: z.array(z.string()),
})

export const customizedResumeSchema = z.object({
  name: z.string(),
  title: z.string(),
  contact: z.string(),
  summary: z.string(),
  skills: z.array(skillGroupSchema),
  experience: z.array(experienceItemSchema),
  projects: z.array(projectItemSchema),
  education: z.array(z.string()),
  other: z.array(z.string()),
})

export const gapSchema = z.object({
  gap: z.string(),
  note: z.string(),
})

export const analysisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  gaps: z.array(gapSchema),
  changesSummary: z.array(z.string()),
})

export const tailorResultSchema = z.object({
  customizedResume: customizedResumeSchema,
  analysis: analysisSchema,
})

export type CustomizedResume = z.infer<typeof customizedResumeSchema>
export type TailorAnalysis = z.infer<typeof analysisSchema>
export type TailorResult = z.infer<typeof tailorResultSchema>

export const tailorResultJsonSchema = {
  type: 'object',
  properties: {
    customizedResume: {
      type: 'object',
      description: 'The tailored resume, containing only facts present in the original resume.',
      properties: {
        name: { type: 'string' },
        title: { type: 'string' },
        contact: { type: 'string' },
        summary: { type: 'string', description: 'Rewritten objective, 2 to 4 sentences.' },
        skills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              items: { type: 'array', items: { type: 'string' } },
            },
            required: ['category', 'items'],
          },
        },
        experience: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              company: { type: 'string' },
              dates: { type: 'string' },
              bullets: { type: 'array', items: { type: 'string' } },
            },
            required: ['role', 'company', 'dates', 'bullets'],
          },
        },
        projects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              tech: { type: 'string' },
              bullets: { type: 'array', items: { type: 'string' } },
            },
            required: ['name', 'tech', 'bullets'],
          },
        },
        education: { type: 'array', items: { type: 'string' } },
        other: { type: 'array', items: { type: 'string' } },
      },
      required: [
        'name',
        'title',
        'contact',
        'summary',
        'skills',
        'experience',
        'projects',
        'education',
        'other',
      ],
    },
    analysis: {
      type: 'object',
      properties: {
        matchScore: {
          type: 'number',
          description: 'Integer 0-100 for the ORIGINAL resume vs the JD. Do not inflate.',
        },
        matchedKeywords: { type: 'array', items: { type: 'string' } },
        missingKeywords: { type: 'array', items: { type: 'string' } },
        gaps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              gap: { type: 'string' },
              note: { type: 'string' },
            },
            required: ['gap', 'note'],
          },
        },
        changesSummary: { type: 'array', items: { type: 'string' } },
      },
      required: ['matchScore', 'matchedKeywords', 'missingKeywords', 'gaps', 'changesSummary'],
    },
  },
  required: ['customizedResume', 'analysis'],
} as const
