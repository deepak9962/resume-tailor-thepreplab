export interface SkillGroup {
  category: string
  items: string[]
}

export interface ExperienceItem {
  role: string
  company: string
  dates: string
  bullets: string[]
}

export interface ProjectItem {
  name: string
  tech: string
  bullets: string[]
}

export interface CustomizedResume {
  name: string
  title: string
  contact: string
  summary: string
  skills: SkillGroup[]
  experience: ExperienceItem[]
  projects: ProjectItem[]
  education: string[]
  other: string[]
}

export interface Gap {
  gap: string
  note: string
}

export interface TailorAnalysis {
  matchScore: number
  matchedKeywords: string[]
  missingKeywords: string[]
  gaps: Gap[]
  changesSummary: string[]
}

export interface TailorResult {
  customizedResume: CustomizedResume
  analysis: TailorAnalysis
  ats?: AtsReport
}

export interface TailorResponse {
  token: string
  expiresAt: string
  result: TailorResult
}

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

export interface CoverLetter {
  greeting: string
  opening: string
  bullets: string[]
  closing: string
  signOff: string
}

export interface CoverLetterEvidence {
  requirement: string
  resumeFact: string
}

export interface CoverLetterAnalysis {
  jdPriorities: string[]
  evidenceUsed: CoverLetterEvidence[]
  unsupportedRequirements: string[]
}

export interface CoverLetterResult {
  coverLetter: CoverLetter
  analysis: CoverLetterAnalysis
}

export interface CoverLetterResponse {
  token: string
  expiresAt: string
  result: CoverLetterResult
}

export type CoverLetterTone = 'professional' | 'warm' | 'direct'

export interface CoverLetterOptions {
  candidateNotes?: string
  companyName?: string
  roleTitle?: string
  tone?: CoverLetterTone
}

export interface ApiError {
  code: string
  message: string
}
