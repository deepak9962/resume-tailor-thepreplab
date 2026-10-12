import { describe, expect, it } from 'vitest'
import { tailorResultSchema } from './tailorResult.js'

const validResult = {
  customizedResume: {
    name: 'Jane Doe',
    title: 'Backend Engineer',
    contact: 'jane@example.com | github.com/jane',
    summary: 'Backend engineer with 5 years building Node.js services.',
    skills: [{ category: 'Languages', items: ['TypeScript', 'Go'] }],
    experience: [
      {
        role: 'Software Engineer',
        company: 'Acme',
        dates: '2021 - 2024',
        bullets: ['Cut API latency by 40%, by adding indexes and caching.'],
      },
    ],
    projects: [{ name: 'Feed Reader', tech: 'Next.js', bullets: ['Handled 10k requests/day.'] }],
    education: ['BSc Computer Science, State University'],
    other: ['AWS Certified Developer'],
  },
  analysis: {
    matchScore: 78,
    matchedKeywords: ['TypeScript'],
    missingKeywords: ['Kubernetes'],
    gaps: [{ gap: 'No Kubernetes experience', note: 'Highlight any container work.' }],
    changesSummary: ['Rewrote the summary to lead with backend impact.'],
  },
}

describe('tailorResultSchema', () => {
  it('accepts a valid tailored result', () => {
    const parsed = tailorResultSchema.safeParse(validResult)
    expect(parsed.success).toBe(true)
  })

  it('rejects a match score outside 0-100', () => {
    const parsed = tailorResultSchema.safeParse({
      ...validResult,
      analysis: { ...validResult.analysis, matchScore: 140 },
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects a missing customized resume section', () => {
    const invalid = {
      customizedResume: { ...validResult.customizedResume },
      analysis: validResult.analysis,
    } as Record<string, unknown>
    delete (invalid.customizedResume as Record<string, unknown>).summary

    expect(tailorResultSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects malformed gaps', () => {
    const parsed = tailorResultSchema.safeParse({
      ...validResult,
      analysis: { ...validResult.analysis, gaps: [{ gap: 'only a gap' }] },
    })
    expect(parsed.success).toBe(false)
  })
})
