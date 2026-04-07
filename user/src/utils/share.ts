/**
 * 微信分享服务
 * 支持分享到微信好友和朋友圈
 */

export interface ShareCardData {
  title: string
  routeId: string | number
  days: number
  poiCount: number
  coverImage?: string
  tags?: string[]
}

/**
 * 圆角矩形辅助函数
 */
function drawRoundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/**
 * 生成分享图片路径（通过 Canvas 绘制）
 * @param data 分享数据
 * @returns 生成的图片临时路径
 */
export async function generateShareCard(data: ShareCardData): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvasWidth = 300
    const canvasHeight = 400

    // #ifdef H5
    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('无法创建 Canvas'))
      return
    }

    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight)
    gradient.addColorStop(0, '#1890FF')
    gradient.addColorStop(1, '#52C41A')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // 装饰圆
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.beginPath()
    ctx.arc(canvasWidth - 50, 50, 80, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.beginPath()
    ctx.arc(50, canvasHeight - 50, 60, 0, Math.PI * 2)
    ctx.fill()

    // 标题卡片
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    drawRoundRect(ctx, 20, 100, canvasWidth - 40, 200, 16)
    ctx.fill()

    // 路线图标
    ctx.fillStyle = '#1890FF'
    ctx.beginPath()
    ctx.arc(50, 50, 30, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('文旅导览', 90, 50)

    ctx.fillStyle = '#1a1a1a'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(data.title || '我的旅行路线', canvasWidth / 2, 145)

    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(40, 175)
    ctx.lineTo(canvasWidth - 40, 175)
    ctx.stroke()

    ctx.fillStyle = '#666'
    ctx.font = '18px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`${data.days} 天行程`, 45, 210)
    ctx.fillText(`${data.poiCount} 个景点`, 45, 245)

    if (data.tags && data.tags.length > 0) {
      const tagText = data.tags.slice(0, 3).join(' · ')
      ctx.fillStyle = '#1890FF'
      ctx.font = '16px sans-serif'
      ctx.fillText(tagText, 45, 280, canvasWidth - 90)
    }

    ctx.fillStyle = '#999'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('点击查看路线详情', canvasWidth / 2, canvasHeight - 30)

    // 导出为临时文件
    const dataUrl = canvas.toDataURL('image/png')
    const base64 = dataUrl.replace(/^data:image\/(\w+);base64,/, '')
    const fileManager = uni.getFileSystemManager()
    const tempFilePath = `${wx.env.USER_DATA_PATH}/share_card_${Date.now()}.png`

    fileManager.writeFile({
      filePath: tempFilePath,
      data: base64,
      encoding: 'base64',
      success: () => resolve(tempFilePath),
      fail: (err) => reject(err)
    })

    // #endif

    // #ifndef H5
    // 小程序环境使用 uni.canvasToTempFilePath
    const ctx2 = uni.createCanvasContext('shareCanvas')
    const canvas2 = { width: canvasWidth, height: canvasHeight }

    ctx2.setFillStyle('#1890FF')
    ctx2.fillRect(0, 0, canvasWidth, 100)

    ctx2.setFillStyle('#fff')
    ctx2.setFontSize(20)
    ctx2.fillText(data.title || '我的旅行路线', 20, 50)

    ctx2.setFillStyle('#666')
    ctx2.setFontSize(14)
    ctx2.fillText(`${data.days}天 · ${data.poiCount}个景点`, 20, 80)

    ctx2.draw(false, () => {
      uni.canvasToTempFilePath({
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
        destWidth: canvasWidth * 2,
        destHeight: canvasHeight * 2,
        canvasId: 'shareCanvas',
        fileType: 'png',
        quality: 0.9,
        success: (res) => resolve(res.tempFilePath),
        fail: (err) => reject(err)
      })
    })
    // #endif
  })
}

/**
 * 分享到微信好友
 */
export async function shareToWechat(data: ShareCardData) {
  try {
    uni.showLoading({ title: '生成分享图片...' })
    const imagePath = await generateShareCard(data)
    uni.hideLoading()

    uni.share({
      provider: 'weixin',
      scene: 'WXSceneSession',
      type: 2,
      imageUrl: imagePath,
      title: `${data.title} - ${data.days}天${data.poiCount}个景点`,
      success: () => console.log('[Share] 分享成功'),
      fail: (err) => {
        console.error('[Share] 分享失败:', err)
        uni.showToast({ title: '分享失败', icon: 'none' })
      }
    })
  } catch (error) {
    uni.hideLoading()
    console.error('[Share] 生成分享图片失败:', error)
    uni.showToast({ title: '分享图片生成失败', icon: 'none' })
  }
}

/**
 * 分享到朋友圈
 */
export async function shareToTimeline(data: ShareCardData) {
  try {
    uni.showLoading({ title: '生成分享图片...' })
    const imagePath = await generateShareCard(data)
    uni.hideLoading()

    uni.share({
      provider: 'weixin',
      scene: 'WXSenceTimeline',
      type: 2,
      imageUrl: imagePath,
      title: `${data.title} - ${data.days}天${data.poiCount}个景点`,
      success: () => console.log('[Share] 分享成功'),
      fail: (err) => {
        console.error('[Share] 分享失败:', err)
        uni.showToast({ title: '分享失败', icon: 'none' })
      }
    })
  } catch (error) {
    uni.hideLoading()
    console.error('[Share] 生成分享图片失败:', error)
  }
}

/**
 * 显示分享菜单
 */
export function showShareMenu(data: ShareCardData) {
  uni.showActionSheet({
    itemList: ['分享给好友', '分享到朋友圈'],
    success: async (res) => {
      if (res.tapIndex === 0) {
        await shareToWechat(data)
      } else if (res.tapIndex === 1) {
        await shareToTimeline(data)
      }
    }
  })
}
