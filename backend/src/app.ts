import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
import { config } from './lib/config.js'
import { AppError } from './lib/errors.js'
import { coverLetterRoutes } from './routes/coverLetter.js'
import { downloadRoutes } from './routes/download.js'
import { healthRoutes } from './routes/health.js'
import { resumeTailorRoutes } from './routes/resumeTailor.js'

export const buildServer = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      redact: ['req.headers.authorization', 'req.headers["x-goog-api-key"]'],
    },
  })

  await app.register(cors, { origin: config.CORS_ORIGIN })
  await app.register(rateLimit, { max: 30, timeWindow: '1 minute' })
  await app.register(multipart, {
    limits: {
      fileSize: config.maxFileSizeBytes,
      files: 1,
      fields: 5,
    },
  })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error)

    if (error instanceof AppError && error.cause) {
      request.log.error({ cause: error.cause }, 'Underlying cause of AppError')
    }

    if (error instanceof AppError) {
      return reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message } })
    }

    if (error.code === 'FST_REQ_FILE_TOO_LARGE' || error.statusCode === 413) {
      return reply.code(413).send({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Resume exceeds the ${config.MAX_FILE_SIZE_MB} MB limit.`,
        },
      })
    }

    const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500
    return reply
      .code(statusCode)
      .send({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } })
  })

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found.' } })
  })

  await app.register(healthRoutes)
  await app.register(resumeTailorRoutes)
  await app.register(coverLetterRoutes)
  await app.register(downloadRoutes)

  return app
}
