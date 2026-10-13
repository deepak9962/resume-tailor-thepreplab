import type { FastifyPluginAsync } from 'fastify'
import { config } from '../lib/config.js'
import { badRequest, payloadTooLarge } from '../lib/errors.js'
import { scoreAts } from '../services/ats.js'
import { extractText } from '../services/extractText.js'
import { generatePdf } from '../services/generatePdf.js'
import { tailorResume } from '../services/tailor.js'
import * as tokenStore from '../services/tokenStore.js'

export const resumeTailorRoutes: FastifyPluginAsync = async (app) => {
  app.post('/resume-tailor', async (request) => {
    let jobDescription = ''
    let resumeBuffer: Buffer | undefined

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (part.fieldname === 'resume') {
          resumeBuffer = await part.toBuffer()
          if (part.file.truncated) {
            throw payloadTooLarge(
              `Resume exceeds the ${config.MAX_FILE_SIZE_MB} MB limit.`,
            )
          }
        } else {
          await part.toBuffer()
        }
      } else if (part.fieldname === 'jobDescription') {
        jobDescription = String(part.value)
      }
    }

    const trimmedJd = jobDescription.trim()
    if (trimmedJd.length < config.MIN_JD_LENGTH) {
      throw badRequest(
        `Please paste a job description of at least ${config.MIN_JD_LENGTH} characters.`,
      )
    }
    if (trimmedJd.length > config.MAX_JD_LENGTH) {
      throw badRequest(
        `Please shorten the job description to ${config.MAX_JD_LENGTH.toLocaleString('en-US')} characters or fewer.`,
      )
    }

    if (!resumeBuffer || resumeBuffer.length === 0) {
      throw badRequest('A resume file (PDF or DOCX) is required.')
    }

    const extracted = await extractText(resumeBuffer)
    let resumeText = extracted
    if (resumeText.length > config.MAX_RESUME_TEXT_LENGTH) {
      request.log.warn(
        { length: resumeText.length, limit: config.MAX_RESUME_TEXT_LENGTH },
        'Truncating extracted resume text to the configured maximum',
      )
      resumeText = resumeText.slice(0, config.MAX_RESUME_TEXT_LENGTH)
    }

    const result = await tailorResume(trimmedJd, resumeText)
    const pdf = await generatePdf(result)
    const ats = await scoreAts(result, pdf)
    const { token, expiresAt } = tokenStore.save(pdf, {
      jobDescription: trimmedJd,
      resumeText,
      resume: result.customizedResume,
    })

    return {
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      result: { ...result, ats },
    }
  })
}
