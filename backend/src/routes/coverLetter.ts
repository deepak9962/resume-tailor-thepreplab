import type { FastifyPluginAsync } from 'fastify'
import { badRequest, gone, notFound } from '../lib/errors.js'
import { coverLetterRequestSchema } from '../schemas/coverLetter.js'
import { generateCoverLetter } from '../services/coverLetter.js'
import { generateCoverLetterPdf } from '../services/generateCoverLetterPdf.js'
import * as tokenStore from '../services/tokenStore.js'

export const coverLetterRoutes: FastifyPluginAsync = async (app) => {
  app.post('/cover-letter', async (request) => {
    const parsed = coverLetterRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      throw badRequest('A valid tailoring token is required to write a cover letter.')
    }

    const { token, candidateNotes, companyName, roleTitle, tone } = parsed.data
    const found = tokenStore.getContext(token)

    if (found.status === 'missing') {
      throw notFound('Tailoring session not found. Please tailor the resume again.')
    }
    if (found.status === 'expired') {
      throw gone('This session expired. Please tailor the resume again.')
    }

    const result = await generateCoverLetter(
      {
        jobDescription: found.context.jobDescription,
        resumeText: found.context.resumeText,
      },
      { candidateNotes, companyName, roleTitle, tone },
    )

    const pdf = await generateCoverLetterPdf(result, found.context.resume)
    const download = tokenStore.save(pdf)

    return {
      token: download.token,
      expiresAt: new Date(download.expiresAt).toISOString(),
      result,
    }
  })
}
