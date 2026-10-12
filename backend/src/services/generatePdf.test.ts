import { describe, expect, it } from 'vitest'
import { generatePdf } from './generatePdf.js'
import type { TailorResult } from '../schemas/tailorResult.js'

const result: TailorResult = {
  customizedResume: {
    name: 'Jane Doe',
    title: 'Backend Engineer',
    contact: 'jane.doe@example.com | +1 555 123 4567 | linkedin.com/in/janedoe',
    summary: 'Backend engineer with 5 years building Node.js services and REST APIs.',
    skills: [{ category: 'Languages', items: ['TypeScript', 'Node.js', 'PostgreSQL'] }],
    experience: [
      {
        role: 'Software Engineer',
        company: 'Acme Corp',
        dates: '2021 - 2024',
        bullets: [
          'Cut **p95 API latency by 40%**, by adding **Redis** caching and rewriting hot paths.',
          'Built a **TypeScript** REST service handling 2M requests/day on AWS ECS.',
        ],
      },
    ],
    projects: [
      { name: 'Resume Tailor', tech: 'TypeScript, Fastify, PostgreSQL', bullets: ['Built an LLM-backed tailoring service.'] },
    ],
    education: ['BSc Computer Science, State University'],
    other: [],
  },
  analysis: {
    matchScore: 80,
    matchedKeywords: [],
    missingKeywords: [],
    gaps: [],
    changesSummary: [],
  },
}

const countPages = (pdf: string): number => (pdf.match(/\/Type\s*\/Page[^s]/g) ?? []).length

describe('generatePdf', () => {
  it('renders a single-page PDF', async () => {
    const buffer = await generatePdf(result)
    const text = buffer.toString('latin1')
    expect(text.startsWith('%PDF-')).toBe(true)
    expect(countPages(text)).toBe(1)
  })

  it('embeds exactly one clickable link per email/URL in the contact line', async () => {
    const buffer = await generatePdf(result)
    const text = buffer.toString('latin1')
    const links = text.match(/\/Subtype\s*\/Link/g) ?? []
    expect(links).toHaveLength(2)
    expect(text).toContain('/URI (mailto:jane.doe@example.com)')
    expect(text).toContain('/URI (https://linkedin.com/in/janedoe)')
  })

  it('embeds the Carlito font family', async () => {
    const buffer = await generatePdf(result)
    const text = buffer.toString('latin1')
    expect(text).toContain('Carlito-Regular')
    expect(text).toContain('Carlito-Bold')
    expect(text).toContain('Carlito-Italic')
  })

  it('linkifies contacts across newlines, labels and bare domains', async () => {
    const multiline: TailorResult = {
      ...result,
      customizedResume: {
        ...result.customizedResume,
        contact: 'Email: jane.doe@example.com\n+1 555 123 4567\nLinkedIn: linkedin.com/in/janedoe',
      },
    }
    const buffer = await generatePdf(multiline)
    const text = buffer.toString('latin1')
    const links = text.match(/\/Subtype\s*\/Link/g) ?? []
    expect(links).toHaveLength(2)
    expect(text).toContain('/URI (mailto:jane.doe@example.com)')
    expect(text).toContain('/URI (https://linkedin.com/in/janedoe)')
  })
})
