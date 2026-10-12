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
}

export interface TailorResponse {
  token: string
  expiresAt: string
  result: TailorResult
}

export interface ApiError {
  code: string
  message: string
}
