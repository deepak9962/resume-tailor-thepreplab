import { describe, expect, it } from 'vitest'
import { generateCoverLetterPdf } from './generateCoverLetterPdf.js'
import type { CoverLetterResult } from '../schemas/coverLetter.js'
import type { CustomizedResume } from '../schemas/tailorResult.js'

const resume: CustomizedResume = {
  name: 'Jane Doe',
  title: 'Backend Engineer',
  contact: 'jane.doe@example.com | +1 555 123 4567 | linkedin.com/in/janedoe',
  summary: '',
  skills: [],
  experience: [],
  projects: [],
  education: [],
  other: [],
}

const result: CoverLetterResult = {
  coverLetter: {
    greeting: 'Dear Hiring Manager,',
    opening: 'I am applying for the Backend Engineer role with five years building Node.js services.',
    bullets: [
      'Cut p95 API latency by 40%, by adding Redis caching and rewriting hot paths.',
      'Built a TypeScript REST service handling 2M requests/day on AWS ECS.',
    ],
    closing: 'I would welcome the chance to talk about how I can help your team.',
    signOff: 'Best regards,\nJane Doe',
  },
  analysis: { jdPriorities: [], evidenceUsed: [], unsupportedRequirements: [] },
}

const countPages = (pdf: string): number => (pdf.match(/\/Type\s*\/Page[^s]/g) ?? []).length

describe('generateCoverLetterPdf', () => {
  it('renders a single-page PDF', async () => {
    const buffer = await generateCoverLetterPdf(result, resume)
    const text = buffer.toString('latin1')
    expect(text.startsWith('%PDF-')).toBe(true)
    expect(countPages(text)).toBe(1)
  })

  it('embeds the Carlito font family', async () => {
    const buffer = await generateCoverLetterPdf(result, resume)
    const text = buffer.toString('latin1')
    expect(text).toContain('Carlito-Regular')
    expect(text).toContain('Carlito-Bold')
  })

  it('embeds a clickable link per email/URL in the header', async () => {
    const buffer = await generateCoverLetterPdf(result, resume)
    const text = buffer.toString('latin1')
    const links = text.match(/\/Subtype\s*\/Link/g) ?? []
    expect(links).toHaveLength(2)
    expect(text).toContain('/URI (mailto:jane.doe@example.com)')
    expect(text).toContain('/URI (https://linkedin.com/in/janedoe)')
  })
})
