import { PDFParse } from 'pdf-parse'
import type { CustomizedResume, TailorResult } from '../schemas/tailorResult.js'

export type AtsGroup = 'content' | 'pdf'

export interface AtsCheck {
  id: string
  group: AtsGroup
  label: string
  status: 'pass' | 'fail'
  weight: number
  note?: string
}

export interface AtsReport {
  score: number
  checks: AtsCheck[]
}

const WEIGHTS = {
  contact: 12,
  sections: 10,
  dates: 8,
  metrics: 12,
  verbs: 6,
  keywords: 15,
  summary: 4,
  stuffing: 5,
  clean: 5,
  'pdf-text': 16,
  'pdf-pages': 7,
} as const

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/
const PHONE = /(?:\+?\d[\d\s().-]{5,}\d)/
const LINK = /https?:\/\/|\bwww\.|\blinkedin\.com\b|\bgithub\.com\b|\b[A-Za-z0-9-]+\.(?:com|io|dev|me|net|org)\b/
const WEAK_OPENER = /^(?:responsible\b|worked\b|helped\b|duties\b|tasked\b|in charge of\b)/i
const RISKY_CHARS: Array<[RegExp, string]> = [
  [/\u2014/, 'em dash'],
  [/[\u2018\u2019\u201C\u201D]/, 'smart quotes'],
  [/\u00A0/, 'non-breaking space'],
]
const STOPWORDS = new Set([
  'the', 'and', 'with', 'for', 'from', 'that', 'this', 'your', 'you', 'are', 'was', 'were',
  'has', 'have', 'had', 'not', 'but', 'all', 'any', 'can', 'our', 'their', 'its', 'into',
  'over', 'more', 'most', 'other', 'such', 'than', 'them', 'then', 'they', 'will', 'would',
  'about', 'across', 'also', 'been', 'each', 'using', 'used', 'use', 'via', 'while', 'within',
  'during', 'including', 'and', 'per', 'new', 'led', 'and', 'of', 'to', 'in', 'on', 'at',
  'by', 'as', 'an', 'or', 'is', 'it', 'be', 'we', 'my', 'i',
])

const MIN_PDF_TEXT = 200

const stripMarkdown = (value: string): string => value.replace(/\*\*/g, '')

const allStrings = (resume: CustomizedResume): string[] => {
  const values: string[] = [resume.name, resume.title, resume.contact, resume.summary]
  values.push(...resume.education, ...resume.other)
  for (const skill of resume.skills) {
    values.push(skill.category, ...skill.items)
  }
  for (const item of resume.experience) {
    values.push(item.role, item.company, item.dates, ...item.bullets)
  }
  for (const item of resume.projects) {
    values.push(item.name, item.tech, ...item.bullets)
  }
  return values
}

const resumeText = (resume: CustomizedResume): string =>
  allStrings(resume).join(' \n ').toLowerCase()

const contentChecks = (result: TailorResult): AtsCheck[] => {
  const { customizedResume: resume, analysis } = result
  const checks: AtsCheck[] = []

  const hasEmail = EMAIL.test(resume.contact)
  const hasPhone = PHONE.test(resume.contact)
  const hasLink = LINK.test(resume.contact)
  const hasIdentity = resume.name.trim().length > 0 && resume.title.trim().length > 0
  const missingContact = [
    !hasEmail && 'an email',
    !hasPhone && !hasLink && 'a phone number or profile link',
  ].filter(Boolean) as string[]
  checks.push({
    id: 'contact',
    group: 'content',
    label: 'Complete contact details',
    status: hasIdentity && missingContact.length === 0 ? 'pass' : 'fail',
    weight: WEIGHTS.contact,
    note:
      hasIdentity && missingContact.length === 0
        ? undefined
        : `Missing ${[...(!hasIdentity ? ['a name and target title'] : []), ...missingContact].join(', ')}.`,
  })

  const emptySections = [
    !resume.summary.trim() && 'summary',
    (resume.skills.length === 0 || resume.skills.every((group) => group.items.length === 0)) &&
      'skills',
    resume.experience.length === 0 && 'experience',
    resume.education.length === 0 && 'education',
  ].filter(Boolean) as string[]
  checks.push({
    id: 'sections',
    group: 'content',
    label: 'Standard sections present',
    status: emptySections.length === 0 ? 'pass' : 'fail',
    weight: WEIGHTS.sections,
    note: emptySections.length === 0 ? undefined : `Missing: ${emptySections.join(', ')}.`,
  })

  const rolesWithoutDates = resume.experience.filter((item) => !item.dates.trim())
  checks.push({
    id: 'dates',
    group: 'content',
    label: 'Every role has dates',
    status: rolesWithoutDates.length === 0 ? 'pass' : 'fail',
    weight: WEIGHTS.dates,
    note:
      rolesWithoutDates.length === 0
        ? undefined
        : `${rolesWithoutDates.length} role(s) have no dates.`,
  })

  const experienceBullets = resume.experience.flatMap((item) => item.bullets)
  const quantified = experienceBullets.filter((bullet) => /\d/.test(bullet)).length
  const needsMetrics = experienceBullets.length > 0 && quantified >= Math.ceil(experienceBullets.length / 3)
  checks.push({
    id: 'metrics',
    group: 'content',
    label: 'Quantified achievements',
    status: needsMetrics ? 'pass' : 'fail',
    weight: WEIGHTS.metrics,
    note: needsMetrics
      ? undefined
      : 'Add measurable results (numbers, %, $) to experience bullets.',
  })

  const weakBullets = experienceBullets.filter((bullet) =>
    WEAK_OPENER.test(stripMarkdown(bullet).trim()),
  )
  checks.push({
    id: 'verbs',
    group: 'content',
    label: 'Strong bullet openers',
    status: weakBullets.length === 0 ? 'pass' : 'fail',
    weight: WEIGHTS.verbs,
    note:
      weakBullets.length === 0
        ? undefined
        : 'Some bullets open with weak phrases like "Responsible for" or "Worked on".',
  })

  const matched = analysis.matchedKeywords.length
  const missing = analysis.missingKeywords.length
  const total = matched + missing
  const coverage = total === 0 ? 0 : matched / total
  checks.push({
    id: 'keywords',
    group: 'content',
    label: 'Job description keyword coverage',
    status: total > 0 && coverage >= 0.5 ? 'pass' : 'fail',
    weight: WEIGHTS.keywords,
    note:
      total > 0 && coverage >= 0.5
        ? undefined
        : total === 0
          ? 'No keyword comparison was produced.'
          : `Only ${Math.round(coverage * 100)}% of matched keywords appear in the resume.`,
  })

  const summaryWords = resume.summary.trim().split(/\s+/).filter(Boolean).length
  const summaryOk = summaryWords >= 12 && summaryWords <= 90
  checks.push({
    id: 'summary',
    group: 'content',
    label: 'Reasonable summary length',
    status: summaryOk ? 'pass' : 'fail',
    weight: WEIGHTS.summary,
    note: summaryOk
      ? undefined
      : summaryWords === 0
        ? 'The summary is empty.'
        : 'Keep the summary to roughly 2 to 4 sentences.',
  })

  const totalSkills = resume.skills.reduce((sum, group) => sum + group.items.length, 0)
  const frequencies = new Map<string, number>()
  for (const word of resumeText(resume).split(/[^a-z0-9+#.]+/)) {
    if (word.length < 3 || STOPWORDS.has(word)) continue
    frequencies.set(word, (frequencies.get(word) ?? 0) + 1)
  }
  const maxFrequency = Math.max(0, ...frequencies.values())
  const normalized = [...experienceBullets, ...resume.projects.flatMap((item) => item.bullets)].map(
    (bullet) => stripMarkdown(bullet).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
  )
  const hasDuplicateBullets = normalized.some(
    (value, index) => value.length > 0 && normalized.indexOf(value) !== index,
  )
  const stuffed = totalSkills > 40 || maxFrequency > 12 || hasDuplicateBullets
  checks.push({
    id: 'stuffing',
    group: 'content',
    label: 'No keyword or skill stuffing',
    status: stuffed ? 'fail' : 'pass',
    weight: WEIGHTS.stuffing,
    note: stuffed
      ? [
          totalSkills > 40 && `the skills list is very long (${totalSkills} items)`,
          maxFrequency > 12 && `a term is repeated ${maxFrequency} times`,
          hasDuplicateBullets && 'duplicate bullets appear',
        ]
          .filter(Boolean)
          .join('; ') + '.'
      : undefined,
  })

  const risky = RISKY_CHARS.filter(([pattern]) => pattern.test(allStrings(resume).join(' '))).map(
    ([, label]) => label,
  )
  checks.push({
    id: 'clean',
    group: 'content',
    label: 'No ATS-risky characters',
    status: risky.length === 0 ? 'pass' : 'fail',
    weight: WEIGHTS.clean,
    note: risky.length === 0 ? undefined : `Found ${risky.join(', ')}.`,
  })

  return checks
}

const pdfChecks = async (pdf: Buffer): Promise<AtsCheck[]> => {
  let text = ''
  let emptyPages = 0
  let pageCount = 0
  let error: string | undefined

  try {
    const parser = new PDFParse({ data: pdf })
    try {
      const parsed = await parser.getText()
      text = parsed.text.replace(/\s+/g, ' ').trim()
      pageCount = parsed.total
      emptyPages = parsed.pages.filter((page) => page.text.trim().length === 0).length
    } finally {
      await parser.destroy()
    }
  } catch {
    error = 'The PDF could not be parsed as text.'
  }

  const extractable = !error && text.length >= MIN_PDF_TEXT
  const everyPageHasText = !error && pageCount > 0 && emptyPages === 0

  return [
    {
      id: 'pdf-text',
      group: 'pdf',
      label: 'PDF text is extractable',
      status: extractable ? 'pass' : 'fail',
      weight: WEIGHTS['pdf-text'],
      note: extractable
        ? undefined
        : (error ?? `Only ${text.length} characters of text could be read.`),
    },
    {
      id: 'pdf-pages',
      group: 'pdf',
      label: 'Text on every page',
      status: everyPageHasText ? 'pass' : 'fail',
      weight: WEIGHTS['pdf-pages'],
      note: everyPageHasText
        ? undefined
        : (error ?? `${emptyPages} page(s) contain no extractable text.`),
    },
  ]
}

export const scoreAts = async (result: TailorResult, pdf: Buffer): Promise<AtsReport> => {
  const checks = [...contentChecks(result), ...(await pdfChecks(pdf))]
  const score = checks.reduce((sum, check) => sum + (check.status === 'pass' ? check.weight : 0), 0)
  return { score, checks }
}
