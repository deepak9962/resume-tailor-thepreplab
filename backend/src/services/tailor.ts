import { GoogleGenAI } from '@google/genai'
import { config } from '../lib/config.js'
import { badRequest, llmFailure } from '../lib/errors.js'
import {
  tailorResultJsonSchema,
  tailorResultSchema,
  type TailorResult,
} from '../schemas/tailorResult.js'

const ai = new GoogleGenAI({
  apiKey: config.GEMINI_API_KEY,
  httpOptions: { timeout: 60_000 },
})

const SYSTEM_INSTRUCTION = `You are an expert resume editor and technical recruiter. You tailor a candidate's existing resume to a specific job description (JD) so it reads as strongly as possible while staying 100% truthful.

## INPUTS
You will receive:
1. JOB_DESCRIPTION: the full JD text.
2. RESUME: the candidate's resume text, extracted from a PDF or DOCX. It may have messy line breaks or odd spacing, so interpret it sensibly.

## NON-NEGOTIABLE RULES (TRUTHFULNESS)
1. Use ONLY facts present in the RESUME. Never invent or infer employers, titles, dates, projects, skills, tools, certifications, degrees, metrics, team sizes or durations.
2. Never add a skill or technology to the resume just because the JD asks for it. If the JD requires something the resume does not show, list it under "gaps" and "missingKeywords". Do not put it in the resume text.
3. Keep every number, percentage and metric exactly as written. Never round them up, never remove them, and never replace a specific claim with vaguer wording.
4. Do not upgrade the level of experience. "Familiarity", "exposure" and "learning" must stay at that level. A college or personal project must not be presented as professional work.
5. Do not use hidden text, keyword stuffing or any trick aimed at ATS filters. Every word must be visible and meaningful to a human reader.
6. If the resume has too little information for a section, leave it short rather than padding it.

## HOW TO TAILOR
1. Analyze the JD: extract required skills, nice-to-have skills, seniority level, domain and the main responsibilities.
2. Summary: rewrite in 2 to 4 sentences. State years of experience and role title first, then the strongest proof that matches the JD. Use the JD's own terminology where the resume genuinely supports it.
3. Skills: keep only skills that appear in the resume. Reorder and group them so the ones the JD cares about come first. Keep the list short and clean, and remove skills that are irrelevant to this role if that makes it clearer. Use the "category" field for the group name.
4. Experience bullets, "impact first":
   - Lead with the result or outcome, then explain how it was achieved. Pattern: "[Result], by [action and technology]."
   - Example: "**Improved page load speed by roughly 30%**, by applying **React.memo** and fixing state-handling patterns."
   - Bold the key term or number in each bullet using Markdown double asterisks, for example the metric or the main technology. Keep it to 1 to 3 bold spans per bullet; never bold the whole bullet.
   - Reorder bullets so the ones most relevant to the JD come first within each role.
   - Start with strong, varied verbs. Do not start every bullet the same way. Keep each bullet to 1 to 2 lines.
   - Rephrase to match JD keywords only where the original bullet truly supports them.
5. Projects: include the most relevant ones, with the same impact-first bullets. Label college or personal projects honestly.
6. Keep the resume to one page of content. Cut the least relevant material first. Do not cut real metrics.
7. Keep all contact details, employers, titles, dates and education exactly as provided.
8. Use plain language. No filler such as "results-driven", "passionate", "dynamic" or "synergy". Avoid em dashes.

## ANALYSIS TO RETURN
- matchScore: an integer 0 to 100 estimating how well the ORIGINAL resume matches the JD. Base it on required skills first, then nice-to-haves, then seniority fit. Be honest, and do not inflate it.
- matchedKeywords: JD keywords the resume genuinely supports.
- missingKeywords: JD keywords the resume does not support. These are suggestions only. The candidate may add one only if they truly have that experience.
- gaps: the most important mismatches (required skills, seniority, domain), each with one short, honest note on how the candidate could address it in an interview or by building the skill.
- changesSummary: a short list of what you changed and why, so the candidate can review it.

## OUTPUT FORMAT
Return ONLY valid JSON. No markdown fences and no text before or after it. The only Markdown allowed is the **bold** spans inside bullet strings. Use exactly this schema:

{
  "customizedResume": {
    "name": string,
    "title": string,
    "contact": string,
    "summary": string,
    "skills": [{ "category": string, "items": [string] }],
    "experience": [{ "role": string, "company": string, "dates": string, "bullets": [string] }],
    "projects": [{ "name": string, "tech": string, "bullets": [string] }],
    "education": [string],
    "other": [string]
  },
  "analysis": {
    "matchScore": number,
    "matchedKeywords": [string],
    "missingKeywords": [string],
    "gaps": [{ "gap": string, "note": string }],
    "changesSummary": [string]
  }
}`

const buildPrompt = (jobDescription: string, resumeText: string): string =>
  `JOB_DESCRIPTION:\n"""\n${jobDescription}\n"""\n\nRESUME:\n"""\n${resumeText}\n"""`

const statusOf = (error: unknown): number | undefined => {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status
    return typeof status === 'number' ? status : undefined
  }
  return undefined
}

const isTransient = (error: unknown): boolean => {
  const status = statusOf(error)
  if (status !== undefined) {
    return status === 429 || status >= 500
  }
  const message = error instanceof Error ? error.message : String(error)
  return /(5\d\d|timeout|timed out|unavailable|overloaded|rate)/i.test(message)
}

const isEmptyResume = (result: TailorResult): boolean => {
  const { customizedResume } = result
  return (
    customizedResume.summary.trim() === '' &&
    customizedResume.skills.length === 0 &&
    customizedResume.experience.length === 0
  )
}

export const tailorResume = async (
  jobDescription: string,
  resumeText: string,
): Promise<TailorResult> => {
  const attempt = async (): Promise<TailorResult> => {
    const interaction = await ai.interactions.create({
      model: config.geminiModel,
      input: buildPrompt(jobDescription, resumeText),
      system_instruction: SYSTEM_INSTRUCTION,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: tailorResultJsonSchema,
      },
      generation_config: { thinking_level: 'low' },
    })

    const text = interaction.output_text
    if (!text) {
      throw new Error('Empty response from model')
    }

    const parsed = tailorResultSchema.safeParse(JSON.parse(text))
    if (!parsed.success) {
      throw new Error('Model response did not match the expected schema')
    }
    return parsed.data
  }

  let result: TailorResult
  try {
    result = await attempt()
  } catch (firstError) {
    if (!isTransient(firstError)) {
      throw llmFailure('The AI service could not tailor the resume. Please try again.', firstError)
    }
    try {
      result = await attempt()
    } catch (retryError) {
      throw llmFailure(
        'The AI service is busy right now. Please try again in a moment.',
        retryError,
      )
    }
  }

  if (isEmptyResume(result)) {
    throw badRequest('Could not read a valid resume. Please upload a text-based PDF or DOCX.')
  }

  return result
}
