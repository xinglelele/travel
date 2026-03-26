import { createApp } from './app'
import { env } from './config/env'
import { prisma } from './config'

async function main() {
  const app = createApp()

  // 测试数据库连接
  try {
    await prisma.$connect()
    console.log('✅ Database connected')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }

  app.listen(env.port, () => {
    console.log(`🚀 Server running at http://localhost:${env.port}`)
  })
}

main().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})
