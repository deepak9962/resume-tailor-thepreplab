import type { FastifyPluginAsync } from 'fastify'
import * as tokenStore from '../services/tokenStore.js'

export const downloadRoutes: FastifyPluginAsync = async (app) => {
  app.get('/download/:token', async (request, reply) => {
    const { token } = request.params as { token: string }
    const download = tokenStore.get(token)

    if (download.status === 'missing') {
      return reply
        .code(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Download link not found.' } })
    }

    if (download.status === 'expired') {
      return reply.code(410).send({
        error: { code: 'EXPIRED', message: 'This download link has expired (5 minute limit).' },
      })
    }

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', 'attachment; filename="tailored-resume.pdf"')
      .send(download.buffer)
  })
}
