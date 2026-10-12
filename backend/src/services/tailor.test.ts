import { beforeEach, describe, expect, it, vi } from 'vitest'

const { create } = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    interactions = { create }
  },
}))

import { tailorResume } from './tailor.js'

const fullResult = {
  customizedResume: {
    name: 'Jane Doe',
    title: 'Backend Engineer',
    contact: 'jane@example.com',
    summary: 'Backend engineer with 5 years building Node.js services.',
    skills: [{ category: 'Languages', items: ['TypeScript'] }],
    experience: [
      { role: 'Software Engineer', company: 'Acme', dates: '2021 - 2024', bullets: ['Cut latency by 40%.'] },
    ],
    projects: [],
    education: ['BSc Computer Science'],
    other: [],
  },
  analysis: {
    matchScore: 80,
    matchedKeywords: ['TypeScript'],
    missingKeywords: ['Kubernetes'],
    gaps: [{ gap: 'No Kubernetes', note: 'Mention container work.' }],
    changesSummary: ['Rewrote the summary.'],
  },
}

const emptyResult = {
  customizedResume: {
    name: 'Jane Doe',
    title: '',
    contact: '',
    summary: '',
    skills: [],
    experience: [],
    projects: [],
    education: [],
    other: [],
  },
  analysis: {
    matchScore: 0,
    matchedKeywords: [],
    missingKeywords: [],
    gaps: [],
    changesSummary: [],
  },
}

beforeEach(() => {
  create.mockReset()
})

describe('tailorResume', () => {
  it('returns the tailored result for valid model output', async () => {
    create.mockResolvedValueOnce({ output_text: JSON.stringify(fullResult) })

    const result = await tailorResume('a long enough job description', 'resume text')
    expect(result).toEqual(fullResult)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('throws an LLM failure when the model returns invalid JSON', async () => {
    create.mockResolvedValueOnce({ output_text: 'not json' })

    await expect(tailorResume('jd', 'resume')).rejects.toMatchObject({ code: 'LLM_FAILURE' })
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('throws an LLM failure when the model output breaks the schema', async () => {
    create.mockResolvedValueOnce({ output_text: JSON.stringify({ customizedResume: {} }) })

    await expect(tailorResume('jd', 'resume')).rejects.toMatchObject({ code: 'LLM_FAILURE' })
  })

  it('rejects an empty/non-resume result with a bad request', async () => {
    create.mockResolvedValueOnce({ output_text: JSON.stringify(emptyResult) })

    await expect(tailorResume('jd', 'resume')).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('retries once on a transient failure', async () => {
    create
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce({ output_text: JSON.stringify(fullResult) })

    const result = await tailorResume('jd', 'resume')
    expect(result).toEqual(fullResult)
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('retries once on a transient failure reported by status code', async () => {
    const transient = Object.assign(new Error('upstream error'), { status: 503 })
    create.mockRejectedValueOnce(transient).mockResolvedValueOnce({ output_text: JSON.stringify(fullResult) })

    const result = await tailorResume('jd', 'resume')
    expect(result).toEqual(fullResult)
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('does not retry a non-transient failure and exposes the cause', async () => {
    const fatal = Object.assign(new Error('bad request'), { status: 400 })
    create.mockRejectedValue(fatal)

    await expect(tailorResume('jd', 'resume')).rejects.toMatchObject({
      code: 'LLM_FAILURE',
      cause: fatal,
    })
    expect(create).toHaveBeenCalledTimes(1)
  })
})
