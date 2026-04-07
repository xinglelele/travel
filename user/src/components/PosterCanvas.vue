<template>
  <canvas
    :id="canvasId"
    canvas-id="checkPosterCanvas"
    class="poster-canvas"
    :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

export interface CheckRecord {
  id: string
  poiId: string
  poiName: string
  poiImage?: string
  address?: string
  checkedAt: string
  distance?: number
  note?: string
}

export interface PosterData {
  title?: string
  records: CheckRecord[]
  totalDays?: number
  totalPois?: number
  coverImage?: string
}

const props = defineProps<{
  data: PosterData
  canvasId?: string
}>()

const canvasId = props.canvasId || 'checkPosterCanvas'
const canvasWidth = 750
const canvasHeight = 1100

onMounted(() => {
  drawPoster()
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function drawPoster() {
  const ctx = uni.createCanvasContext(canvasId)

  // 背景渐变
  ctx.setFillStyle('#f5f7fa')
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // 顶部背景
  const gradient = ctx.createLinearGradient(0, 0, canvasWidth, 300)
  gradient.addColorStop(0, '#1890FF')
  gradient.addColorStop(1, '#52C41A')
  ctx.setFillStyle(gradient)
  ctx.fillRect(0, 0, canvasWidth, 280)

  // 装饰圆
  ctx.setFillStyle('rgba(255, 255, 255, 0.1)')
  ctx.beginPath()
  ctx.arc(canvasWidth - 80, 80, 100, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(80, canvasHeight - 150, 60, 0, Math.PI * 2)
  ctx.fill()

  // 标题
  ctx.setFillStyle('#fff')
  ctx.setFontSize(48)
  ctx.setTextAlign('center')
  ctx.fillText(props.data.title || '我的打卡记录', canvasWidth / 2, 80)

  // 统计信息
  ctx.setFontSize(28)
  ctx.fillText(`${props.data.totalDays || 1} 天 · ${props.data.records.length} 个景点`, canvasWidth / 2, 130)

  // 日期范围
  if (props.data.records.length > 0) {
    const dates = props.data.records.map(r => new Date(r.checkedAt).toLocaleDateString())
    const uniqueDates = [...new Set(dates)]
    const dateRange = uniqueDates.length > 1
      ? `${formatDate(props.data.records[0].checkedAt)} - ${formatDate(props.data.records[props.data.records.length - 1].checkedAt)}`
      : formatDate(props.data.records[0].checkedAt)
    ctx.setFontSize(24)
    ctx.fillText(dateRange, canvasWidth / 2, 170)
  }

  // 打卡记录列表
  let yPos = 320
  const itemHeight = 140
  const maxItems = 5
  const displayRecords = props.data.records.slice(0, maxItems)

  displayRecords.forEach((record, index) => {
    // 卡片背景
    ctx.setFillStyle('#fff')
    ctx.beginPath()
    ctx.roundRect(30, yPos, canvasWidth - 60, itemHeight - 10, 16)
    ctx.fill()

    // 序号圆圈
    ctx.setFillStyle('#1890FF')
    ctx.beginPath()
    ctx.arc(65, yPos + 35, 24, 0, Math.PI * 2)
    ctx.fill()

    ctx.setFillStyle('#fff')
    ctx.setFontSize(22)
    ctx.setTextAlign('center')
    ctx.fillText(String(index + 1), 65, yPos + 42)

    // 景点名称
    ctx.setFillStyle('#1a1a1a')
    ctx.setFontSize(30)
    ctx.setTextAlign('left')
    ctx.fillText(record.poiName, 105, yPos + 40, canvasWidth - 220)

    // 打卡日期
    ctx.setFillStyle('#999')
    ctx.setFontSize(22)
    ctx.fillText(formatDate(record.checkedAt), 105, yPos + 75, 300)

    // 打卡距离
    if (record.distance !== undefined) {
      ctx.setFillStyle('#52C41A')
      ctx.setFontSize(20)
      const distText = record.distance < 1000
        ? `${record.distance}m`
        : `${(record.distance / 1000).toFixed(1)}km`
      ctx.fillText(`距景点 ${distText}`, 105, yPos + 105)
    }

    yPos += itemHeight
  })

  // 如果有更多记录
  if (props.data.records.length > maxItems) {
    ctx.setFillStyle('#1890FF')
    ctx.setFontSize(24)
    ctx.setTextAlign('center')
    ctx.fillText(`还有 ${props.data.records.length - maxItems} 个打卡点...`, canvasWidth / 2, yPos + 30)
    yPos += 60
  }

  // 底部
  ctx.setFillStyle('#fff')
  ctx.beginPath()
  ctx.roundRect(30, yPos + 20, canvasWidth - 60, 120, 16)
  ctx.fill()

  ctx.setFillStyle('#1890FF')
  ctx.setFontSize(28)
  ctx.setTextAlign('center')
  ctx.fillText('用小程序记录你的旅行足迹', canvasWidth / 2, yPos + 70)

  ctx.setFillStyle('#999')
  ctx.setFontSize(20)
  ctx.fillText('文旅导览 · 智慧旅游平台', canvasWidth / 2, yPos + 100)

  // 绘制完成
  ctx.draw()
}

async function exportPoster(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      destWidth: canvasWidth * 2,
      destHeight: canvasHeight * 2,
      canvasId: canvasId,
      fileType: 'png',
      quality: 0.9,
      success: (res) => {
        resolve(res.tempFilePath)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

async function saveToAlbum(tempFilePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: () => resolve(),
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          uni.showModal({
            title: '提示',
            content: '需要您授权保存图片到相册',
            success: (res) => {
              if (res.confirm) {
                uni.openSetting()
              }
            }
          })
        }
        reject(err)
      }
    })
  })
}

// 暴露方法给父组件调用
defineExpose({
  exportPoster,
  saveToAlbum
})
</script>

<style scoped>
.poster-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
}
</style>
