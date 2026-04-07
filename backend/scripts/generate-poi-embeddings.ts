/**
 * POI Embedding 生成脚本
 * 用于为 POI 生成文本向量并存储到数据库
 * 使用方法:
 *   npx ts-node scripts/generate-poi-embeddings.ts
 *
 * 前置条件:
 *   1. 数据库已创建并迁移
 *   2. .env 文件已配置 (DASHSCOPE_API_KEY)
 *   3. POI 数据已初始化
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { callQwenEmbedding } from '../src/external/qwen'

const prisma = new PrismaClient()

// ============================================
// 配置
// ============================================

/** 每批处理的 POI 数量 */
const BATCH_SIZE = 5
/** API 请求间隔（毫秒），避免限流 */
const DELAY_MS = 1000
/** 最大重试次数 */
const MAX_RETRIES = 3
/** 重试间隔（毫秒） */
const RETRY_DELAY_MS = 3000

// ============================================
// 工具函数
// ============================================

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 带重试的 API 调用
 */
async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      if (i === retries - 1) throw error

      // 检查是否是限流错误
      const isRateLimit = error?.response?.status === 429 ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('限流')

      if (isRateLimit) {
        console.log(`  ⚠️  触发限流，等待 ${RETRY_DELAY_MS * 2}ms 后重试...`)
        await sleep(RETRY_DELAY_MS * 2)
      } else {
        await sleep(RETRY_DELAY_MS)
      }
    }
  }
  throw new Error('重试次数耗尽')
}

/**
 * 构建 POI 文本内容
 */
function buildPOIText(poi: any): string {
  const parts: string[] = []

  // 1. POI 名称
  const name = typeof poi.poiName === 'string'
    ? poi.poiName
    : poi.poiName?.zh || poi.poiName?.['zh-CN'] || poi.poiName?.en || ''
  if (name) parts.push(`景点名称：${name}`)

  // 2. POI 描述
  const desc = typeof poi.description === 'string'
    ? poi.description
    : poi.description?.zh || poi.description?.['zh-CN'] || ''
  if (desc) parts.push(`景点描述：${desc}`)

  // 3. 标签名称
  if (poi.poiTags && poi.poiTags.length > 0) {
    const tagNames = poi.poiTags
      .map((rel: any) => {
        const tag = rel.tag
        if (!tag) return ''
        if (typeof tag.tagName === 'string') return tag.tagName
        return tag.tagName?.zh || tag.tagName?.['zh-CN'] || ''
      })
      .filter(Boolean)
    if (tagNames.length > 0) {
      parts.push(`景点标签：${tagNames.join('、')}`)
    }
  }

  // 4. 类型分类
  if (poi.poiType) parts.push(`景点类型：${poi.poiType}`)

  // 5. 地区
  if (poi.district) parts.push(`所在地区：${poi.district}`)

  return parts.join('\n')
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('========================================')
  console.log('开始生成 POI Embedding 向量...')
  console.log('========================================\n')

  // 1. 获取所有 POI
  const pois = await prisma.poiInfo.findMany({
    where: { status: 1 },
    include: { poiTags: { include: { tag: true } } }
  })

  console.log(`📊 找到 ${pois.length} 个 POI\n`)

  if (pois.length === 0) {
    console.log('⚠️  没有找到需要生成 embedding 的 POI')
    console.log('💡 请先运行: npx ts-node scripts/init-poi-data.ts')
    console.log('========================================\n')
    return
  }

  // 2. 检查已生成的 embedding
  const poisWithoutEmbedding = pois.filter(poi => !poi.embedding)
  const poisWithEmbedding = pois.filter(poi => !!poi.embedding)

  console.log(`📌 统计:`)
  console.log(`   - 已生成 embedding: ${poisWithEmbedding.length}`)
  console.log(`   - 需生成 embedding: ${poisWithoutEmbedding.length}`)
  console.log('')

  if (poisWithoutEmbedding.length === 0) {
    console.log('✅ 所有 POI 的 embedding 已生成完毕!')
    console.log('========================================\n')
    return
  }

  // 3. 分批生成 embedding
  let successCount = 0
  let failCount = 0
  const failList: { id: number; name: string; error: string }[] = []

  console.log('🚀 开始生成 embedding...\n')

  for (let i = 0; i < poisWithoutEmbedding.length; i += BATCH_SIZE) {
    const batch = poisWithoutEmbedding.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(poisWithoutEmbedding.length / BATCH_SIZE)

    console.log(`📦 批次 ${batchNum}/${totalBatches} (${batch.length} 个 POI)`)

    for (const poi of batch) {
      const poiName = typeof poi.poiName === 'string'
        ? poi.poiName
        : (poi.poiName as any)?.zh || (poi.poiName as any)?.['zh-CN'] || `ID:${poi.id}`

      try {
        // 构建文本
        const textContent = buildPOIText(poi)
        console.log(`  📝 ${poiName}`)
        console.log(`     文本长度: ${textContent.length} 字符`)

        // 生成 embedding
        const embedding = await callWithRetry(() => callQwenEmbedding(textContent))

        // 存储到数据库
        await prisma.poiInfo.update({
          where: { id: poi.id },
          data: { embedding: embedding as any }
        })

        successCount++
        console.log(`  ✅ 成功 (向量维度: ${embedding.length})\n`)
      } catch (error: any) {
        failCount++
        const errorMsg = error?.message || String(error)
        failList.push({ id: poi.id, name: poiName, error: errorMsg })
        console.log(`  ❌ 失败: ${errorMsg}\n`)
      }

      // API 请求间隔
      if (DELAY_MS > 0) {
        await sleep(DELAY_MS)
      }
    }

    console.log('')
  }

  // 4. 输出统计
  console.log('========================================')
  console.log('✅ Embedding 生成完成!')
  console.log('========================================')
  console.log(`📊 统计:`)
  console.log(`   - 成功: ${successCount}`)
  console.log(`   - 失败: ${failCount}`)

  if (failList.length > 0) {
    console.log('\n❌ 失败的 POI:')
    for (const fail of failList) {
      console.log(`   - ${fail.name} (ID: ${fail.id})`)
      console.log(`     错误: ${fail.error}`)
    }
  }

  // 5. 验证生成结果
  const totalPois = await prisma.poiInfo.count({ where: { status: 1 } })
  const withEmbedding = await prisma.poiInfo.count({
    where: {
      status: 1,
      embedding: { not: Prisma.JsonNull }
    }
  })

  console.log('\n📌 最终统计:')
  console.log(`   - POI 总数: ${totalPois}`)
  console.log(`   - 已生成 embedding: ${withEmbedding}`)
  console.log(`   - 完成率: ${((withEmbedding / totalPois) * 100).toFixed(1)}%`)

  console.log('\n💡 提示:')
  console.log('   - 可以再次运行本脚本以生成失败的 POI')
  console.log('   - 生成 embedding 后，推荐功能将更加智能')
  console.log('========================================\n')
}

// 运行脚本
main()
  .catch((error) => {
    console.error('\n❌ 脚本执行失败:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
