import { config } from '../lib/config.js'
import {
  coverLetterJsonSchema,
  coverLetterResultSchema,
  type CoverLetterResult,
  type CoverLetterTone,
} from '../schemas/coverLetter.js'
import { ai, withRetry } from './gemini.js'
import { createFence, UNTRUSTED_RULES, wrapUntrusted } from './promptSafety.js'

export interface CoverLetterContext {
  jobDescription: string
  resumeText: string
}

export interface CoverLetterOptions {
  candidateNotes?: string
  companyName?: string
  roleTitle?: string
  tone?: CoverLetterTone
}

const SYSTEM_INSTRUCTION = `You are an expert career coach and technical recruiter who writes concise, specific cover letters. You write a cover letter for a candidate using ONLY the facts in their resume and any extra notes they provide, aimed at one specific job description (JD).

## INPUTS
1. JOB_DESCRIPTION: the full JD text.
2. RESUME: the candidate's resume text (may have messy line breaks).
3. CANDIDATE_NOTES (optional): extra true facts the candidate wants included (for example "I use Claude Code daily" or "I can relocate"). Treat these as true.
4. COMPANY_NAME and ROLE_TITLE (optional): if missing, infer them from the JD. If you cannot, use "the team" and "the role".
5. TONE (optional): "professional" (default), "warm" or "direct".

## NON-NEGOTIABLE RULES (TRUTHFULNESS)
1. Use ONLY facts found in the RESUME or CANDIDATE_NOTES. Never invent employers, titles, dates, projects, tools, skills, metrics, team sizes, achievements or motivations.
2. Never claim a skill or tool the JD asks for unless the resume or notes show it. Do not hint at it either.
3. Keep every number exactly as written. Do not round up, inflate or add numbers.
4. Keep experience at its true level. "Exposure" or "familiarity" must stay at that level. A college or personal project must not be described as professional work.
5. Do not mention gaps, missing skills or weaknesses. Simply do not write about requirements the candidate cannot support. Also never pretend to meet them. Choose the strongest true matches instead.
6. Do not use hidden text, keyword stuffing or tricks. Every word must be visible and meaningful.
7. Do not invent facts about the company. Mention something about the company only if it is stated in the JD, and keep it to one short, specific reference.

## HOW TO WRITE
1. Study the JD: identify the 3 to 5 requirements that matter most and the kind of person they want.
2. Pick the candidate's strongest true matches for those requirements. Prefer concrete proof (a shipped project, a measurable result, an end-to-end ownership example) over generic claims.
3. Structure:
   - Opening (2 to 3 sentences): the role being applied for, years of experience and role title, and one sentence on why the candidate fits.
   - Body: 4 to 6 short bullet points. Each bullet starts with the outcome or capability and then gives the proof from the resume. Order them by how much the JD cares.
   - Career pivot (only if the candidate is moving into a different function, such as developer to QA): explain how their existing experience is an advantage for the new role, and state their interest with confidence.
   - Closing (2 to 3 sentences): genuine interest in the role or company, based only on what the JD says, and a polite invitation to talk.
4. Length: 220 to 300 words in total, so it fits on one page with the header.
5. Style:
   - Plain, confident, specific language. Use first person.
   - Do not use filler such as "passionate", "results-driven", "dynamic", "synergy" or "I am writing to express my interest".
   - Do not use em dashes.
   - Do not repeat the resume line by line. Show why the experience matters for this role.
   - Match the JD's terminology only where the resume supports it.
   - Keep the tone positive. Do not apologize or make disclaimers.
6. Address it to "Hiring Manager" unless a name is given in the inputs.

## ANALYSIS TO RETURN
- jdPriorities: the 3 to 5 JD requirements you focused on.
- evidenceUsed: for each, the resume fact you used to support it, so the candidate can verify every claim.
- unsupportedRequirements: important JD requirements the resume does not support, which you intentionally left out of the letter. These are for the candidate's information only.

## OUTPUT FORMAT
Return ONLY valid JSON. No markdown fences and no text before or after it. Use exactly this schema:

{
  "coverLetter": {
    "greeting": string,
    "opening": string,
    "bullets": [string],
    "closing": string,
    "signOff": string
  },
  "analysis": {
    "jdPriorities": [string],
    "evidenceUsed": [{ "requirement": string, "resumeFact": string }],
    "unsupportedRequirements": [string]
  }
}

"signOff" is "Best regards," followed by the candidate's name from the resume, on separate lines.
Use an empty array for "bullets" only if the resume has too little content, and never invent bullets to fill space.

${UNTRUSTED_RULES}`

const orNone = (value: string | undefined): string =>
  value && value.trim() !== '' ? value.trim() : '(none provided)'

const buildPrompt = (
  { jobDescription, resumeText }: CoverLetterContext,
  { candidateNotes, companyName, roleTitle, tone }: CoverLetterOptions,
): string => {
  const fence = createFence()
  return [
    wrapUntrusted('JOB_DESCRIPTION', jobDescription, fence),
    wrapUntrusted('RESUME', resumeText, fence),
    wrapUntrusted('CANDIDATE_NOTES', orNone(candidateNotes), fence),
    wrapUntrusted('COMPANY_NAME', orNone(companyName), fence),
    wrapUntrusted('ROLE_TITLE', orNone(roleTitle), fence),
    `TONE: ${tone ?? 'professional'}`,
  ].join('\n\n')
}

const isEmptyLetter = (result: CoverLetterResult): boolean =>
  result.coverLetter.opening.trim() === '' && result.coverLetter.closing.trim() === ''

export const generateCoverLetter = async (
  context: CoverLetterContext,
  options: CoverLetterOptions = {},
): Promise<CoverLetterResult> => {
  const attempt = async (): Promise<CoverLetterResult> => {
    const interaction = await ai.interactions.create({
      model: config.geminiModel,
      input: buildPrompt(context, options),
      system_instruction: SYSTEM_INSTRUCTION,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: coverLetterJsonSchema,
      },
      generation_config: { thinking_level: 'low' },
    })

    const text = interaction.output_text
    if (!text) {
      throw new Error('Empty response from model')
    }

    const parsed = coverLetterResultSchema.safeParse(JSON.parse(text))
    if (!parsed.success) {
      throw new Error('Model response did not match the expected schema')
    }
    if (isEmptyLetter(parsed.data)) {
      throw new Error('Model returned an empty cover letter')
    }
    return parsed.data
  }

  return withRetry(attempt, {
    failure: 'The AI service could not write the cover letter. Please try again.',
    busy: 'The AI service is busy right now. Please try again in a moment.',
  })
}
