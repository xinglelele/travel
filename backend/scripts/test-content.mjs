import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
try {
  const rows = await p.officialContent.findMany({ take: 1 })
  console.log('ok', rows.length)
} catch (e) {
  console.error('err', e.message, e.code)
} finally {
  await p.$disconnect()
}
