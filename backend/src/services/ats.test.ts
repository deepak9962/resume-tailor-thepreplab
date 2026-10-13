import { describe, expect, it } from 'vitest'
import { scoreAts, type AtsCheck, type AtsReport } from './ats.js'
import { generatePdf } from './generatePdf.js'
import type { CustomizedResume, TailorResult } from '../schemas/tailorResult.js'

const experienceItem: CustomizedResume['experience'][number] = {
  role: 'Software Engineer',
  company: 'Acme Corp',
  dates: '2021 - 2024',
  bullets: [
    'Cut p95 API latency by 40% by adding Redis caching.',
    'Built a TypeScript REST service handling 2M requests per day.',
    'Led migration of 12 services to AWS ECS.',
  ],
}

const base: TailorResult = {
  customizedResume: {
    name: 'Jane Doe',
    title: 'Backend Engineer',
    contact: 'jane.doe@example.com | +1 555 123 4567 | linkedin.com/in/janedoe',
    summary: 'Backend engineer with five years building reliable Node.js services and REST APIs for growing teams.',
    skills: [{ category: 'Languages', items: ['TypeScript', 'Node.js', 'PostgreSQL'] }],
    experience: [experienceItem],
    projects: [
      {
        name: 'Resume Tailor',
        tech: 'TypeScript, Fastify',
        bullets: ['Built an LLM-backed tailoring service used by 300 people.'],
      },
    ],
    education: ['BSc Computer Science, State University'],
    other: [],
  },
  analysis: {
    matchScore: 82,
    matchedKeywords: ['Node.js', 'TypeScript', 'REST APIs'],
    missingKeywords: [],
    gaps: [],
    changesSummary: [],
  },
}

const find = (report: AtsReport, id: string): AtsCheck =>
  report.checks.find((check) => check.id === id) as AtsCheck

const score = async (result: TailorResult): Promise<AtsReport> =>
  scoreAts(result, await generatePdf(result))

describe('scoreAts', () => {
  it('awards a perfect score to a clean, parseable resume', async () => {
    const report = await score(base)
    expect(report.score).toBe(100)
    expect(report.checks.every((check) => check.status === 'pass')).toBe(true)
  })

  it('keeps the weights summing to 100', async () => {
    const report = await score(base)
    const total = report.checks.reduce((sum, check) => sum + check.weight, 0)
    expect(total).toBe(100)
  })

  it('reads the generated PDF as extractable text', async () => {
    const report = await score(base)
    expect(find(report, 'pdf-text').status).toBe('pass')
    expect(find(report, 'pdf-pages').status).toBe('pass')
  })

  it('flags contact details that are missing an email', async () => {
    const report = await score({
      ...base,
      customizedResume: { ...base.customizedResume, contact: '+1 555 123 4567' },
    })
    expect(find(report, 'contact').status).toBe('fail')
  })

  it('flags a role without dates', async () => {
    const report = await score({
      ...base,
      customizedResume: {
        ...base.customizedResume,
        experience: [{ ...experienceItem, dates: '' }],
      },
    })
    expect(find(report, 'dates').status).toBe('fail')
  })

  it('flags bullets with no quantified results', async () => {
    const report = await score({
      ...base,
      customizedResume: {
        ...base.customizedResume,
        experience: [
          {
            ...experienceItem,
            bullets: ['Built a service.', 'Led a team.', 'Shipped a feature.'],
          },
        ],
      },
    })
    expect(find(report, 'metrics').status).toBe('fail')
  })

  it('flags low keyword coverage against the job description', async () => {
    const report = await score({
      ...base,
      analysis: { ...base.analysis, matchedKeywords: ['Node.js'], missingKeywords: ['a', 'b', 'c', 'd'] },
    })
    expect(find(report, 'keywords').status).toBe('fail')
  })

  it('flags keyword or skill stuffing from duplicate bullets', async () => {
    const report = await score({
      ...base,
      customizedResume: {
        ...base.customizedResume,
        experience: [
          {
            ...experienceItem,
            bullets: ['Built the platform end to end.', 'Built the platform end to end.'],
          },
        ],
      },
    })
    expect(find(report, 'stuffing').status).toBe('fail')
  })

  it('flags ATS-risky characters', async () => {
    const report = await score({
      ...base,
      customizedResume: { ...base.customizedResume, summary: 'Backend engineer \u2014 builder of things.' },
    })
    expect(find(report, 'clean').status).toBe('fail')
  })

  it('fails the PDF checks without throwing when the buffer is not a PDF', async () => {
    const report = await scoreAts(base, Buffer.from('not a pdf'))
    expect(find(report, 'pdf-text').status).toBe('fail')
    expect(find(report, 'pdf-pages').status).toBe('fail')
  })
})
