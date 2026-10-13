import { beforeEach, describe, expect, it, vi } from 'vitest'

const { create } = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    interactions = { create }
  },
}))

import { generateCoverLetter } from './coverLetter.js'

const fullResult = {
  coverLetter: {
    greeting: 'Dear Hiring Manager,',
    opening: 'I am applying for the Backend Engineer role with five years building Node.js services.',
    bullets: ['Cut API latency by 40%, by adding caching and rewriting hot paths.'],
    closing: 'I would welcome the chance to talk about how I can help your team.',
    signOff: 'Best regards,\nJane Doe',
  },
  analysis: {
    jdPriorities: ['Node.js services'],
    evidenceUsed: [{ requirement: 'API performance', resumeFact: 'Cut API latency by 40%.' }],
    unsupportedRequirements: ['Kubernetes'],
  },
}

const emptyLetter = {
  coverLetter: {
    greeting: 'Dear Hiring Manager,',
    opening: '',
    bullets: [],
    closing: '',
    signOff: 'Best regards,\nJane Doe',
  },
  analysis: { jdPriorities: [], evidenceUsed: [], unsupportedRequirements: [] },
}

const context = { jobDescription: 'a long enough job description', resumeText: 'resume text' }

beforeEach(() => {
  create.mockReset()
})

describe('generateCoverLetter', () => {
  it('returns the cover letter for valid model output', async () => {
    create.mockResolvedValueOnce({ output_text: JSON.stringify(fullResult) })

    const result = await generateCoverLetter(context)
    expect(result).toEqual(fullResult)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('includes the optional inputs in fenced prompt blocks', async () => {
    create.mockResolvedValueOnce({ output_text: JSON.stringify(fullResult) })

    await generateCoverLetter(context, {
      companyName: 'Acme',
      roleTitle: 'Backend Engineer',
      candidateNotes: 'I can relocate.',
      tone: 'warm',
    })

    const args = create.mock.calls[0]?.[0]
    const input = args?.input as string
    const system = args?.system_instruction as string

    expect(system).toContain('SECURITY - UNTRUSTED INPUT')
    expect(input).toContain('CANDIDATE_NOTES')
    expect(input).toContain('COMPANY_NAME')
    expect(input).toContain('ROLE_TITLE')
    expect(input).toContain('Acme')
    expect(input).toContain('Backend Engineer')
    expect(input).toContain('I can relocate.')
    expect(input).toContain('TONE: warm')
  })

  it('throws an LLM failure when the model returns invalid JSON', async () => {
    create.mockResolvedValueOnce({ output_text: 'not json' })

    await expect(generateCoverLetter(context)).rejects.toMatchObject({ code: 'LLM_FAILURE' })
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('throws an LLM failure when the model output breaks the schema', async () => {
    create.mockResolvedValueOnce({ output_text: JSON.stringify({ coverLetter: {} }) })

    await expect(generateCoverLetter(context)).rejects.toMatchObject({ code: 'LLM_FAILURE' })
  })

  it('throws an LLM failure when the letter is empty', async () => {
    create.mockResolvedValueOnce({ output_text: JSON.stringify(emptyLetter) })

    await expect(generateCoverLetter(context)).rejects.toMatchObject({ code: 'LLM_FAILURE' })
  })

  it('retries once on a transient failure', async () => {
    create
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce({ output_text: JSON.stringify(fullResult) })

    const result = await generateCoverLetter(context)
    expect(result).toEqual(fullResult)
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('does not retry a non-transient failure and exposes the cause', async () => {
    const fatal = Object.assign(new Error('bad request'), { status: 400 })
    create.mockRejectedValue(fatal)

    await expect(generateCoverLetter(context)).rejects.toMatchObject({
      code: 'LLM_FAILURE',
      cause: fatal,
    })
    expect(create).toHaveBeenCalledTimes(1)
  })
})
