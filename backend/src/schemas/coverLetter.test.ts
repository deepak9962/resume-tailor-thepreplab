import { describe, expect, it } from 'vitest'
import {
  COVER_LETTER_INPUT_LIMITS,
  coverLetterRequestSchema,
  coverLetterResultSchema,
} from './coverLetter.js'

const validResult = {
  coverLetter: {
    greeting: 'Dear Hiring Manager,',
    opening: 'I am applying for the Backend Engineer role with five years building Node.js services.',
    bullets: ['Cut API latency by 40%, by adding caching and rewriting hot paths.'],
    closing: 'I would welcome the chance to talk about how I can help your team.',
    signOff: 'Best regards,\nJane Doe',
  },
  analysis: {
    jdPriorities: ['Node.js services', 'API performance'],
    evidenceUsed: [{ requirement: 'API performance', resumeFact: 'Cut API latency by 40%.' }],
    unsupportedRequirements: ['Kubernetes'],
  },
}

describe('coverLetterResultSchema', () => {
  it('accepts a valid cover letter result', () => {
    expect(coverLetterResultSchema.safeParse(validResult).success).toBe(true)
  })

  it('rejects a missing sign-off', () => {
    const invalid = {
      ...validResult,
      coverLetter: { ...validResult.coverLetter },
    } as Record<string, unknown>
    delete (invalid.coverLetter as Record<string, unknown>).signOff
    expect(coverLetterResultSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects malformed evidence entries', () => {
    const parsed = coverLetterResultSchema.safeParse({
      ...validResult,
      analysis: { ...validResult.analysis, evidenceUsed: [{ requirement: 'only a requirement' }] },
    })
    expect(parsed.success).toBe(false)
  })
})

describe('coverLetterRequestSchema', () => {
  it('accepts a token on its own', () => {
    expect(coverLetterRequestSchema.safeParse({ token: 'abc' }).success).toBe(true)
  })

  it('accepts the optional inputs', () => {
    const parsed = coverLetterRequestSchema.safeParse({
      token: 'abc',
      companyName: 'Acme',
      roleTitle: 'Backend Engineer',
      candidateNotes: 'I can relocate.',
      tone: 'warm',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects an unknown tone', () => {
    expect(coverLetterRequestSchema.safeParse({ token: 'abc', tone: 'shouty' }).success).toBe(false)
  })

  it('rejects a missing token', () => {
    expect(coverLetterRequestSchema.safeParse({ tone: 'warm' }).success).toBe(false)
  })

  it('rejects optional inputs beyond the length limits', () => {
    const tooLong = (length: number) => 'x'.repeat(length)
    expect(
      coverLetterRequestSchema.safeParse({ token: 'abc', companyName: tooLong(121) }).success,
    ).toBe(false)
    expect(
      coverLetterRequestSchema.safeParse({ token: 'abc', roleTitle: tooLong(121) }).success,
    ).toBe(false)
    expect(
      coverLetterRequestSchema.safeParse({ token: 'abc', candidateNotes: tooLong(2_001) }).success,
    ).toBe(false)
  })

  it('accepts inputs exactly at the length limits', () => {
    const atLimit = (length: number) => 'x'.repeat(length)
    const parsed = coverLetterRequestSchema.safeParse({
      token: atLimit(COVER_LETTER_INPUT_LIMITS.token),
      companyName: atLimit(COVER_LETTER_INPUT_LIMITS.companyName),
      roleTitle: atLimit(COVER_LETTER_INPUT_LIMITS.roleTitle),
      candidateNotes: atLimit(COVER_LETTER_INPUT_LIMITS.candidateNotes),
    })
    expect(parsed.success).toBe(true)
  })
})
