import { buildServer } from './app.js'
import { config } from './lib/config.js'
import { stopSweeper } from './services/tokenStore.js'

const start = async (): Promise<void> => {
  const app = await buildServer()

  try {
    // await app.listen({ port: config.PORT, host: '0.0.0.0' })
    await app.listen({ port: config.PORT })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }

  const shutdown = async (): Promise<void> => {
    stopSweeper()
    await app.close()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())
}

void start()
