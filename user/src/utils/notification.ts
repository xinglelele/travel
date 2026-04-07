/**
 * 微信订阅消息服务
 * 用于请求用户授权接收订阅消息
 */

// 订阅消息模板 ID（需在微信公众平台配置）
export const MESSAGE_TEMPLATES = {
  // 评论回复通知
  COMMENT_REPLY: 'TM00001', // 示例模板ID，实际需替换
  // 路线被点赞通知
  ROUTE_LIKED: 'TM00002',
  // 系统公告通知
  SYSTEM_ANNOUNCEMENT: 'TM00003',
  // 打卡成功通知
  CHECK_IN_SUCCESS: 'TM00004',
}

/**
 * 请求订阅消息权限
 * @param templateId 模板ID
 * @returns 是否授权成功
 */
export async function requestSubscribeMessage(templateId: string): Promise<boolean> {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    uni.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        console.log('[Subscribe] 请求订阅成功:', res)
        resolve(res[templateId] === 'accept')
      },
      fail: (err) => {
        console.error('[Subscribe] 请求订阅失败:', err)
        resolve(false)
      },
    })
    // #endif

    // #ifndef MP-WEIXIN
    // 非微信小程序环境不处理
    resolve(false)
    // #endif
  })
}

/**
 * 请求多个订阅消息权限
 */
export async function requestMultipleSubscribeMessages(
  templateIds: string[]
): Promise<Record<string, boolean>> {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    uni.requestSubscribeMessage({
      tmplIds: templateIds,
      success: (res) => {
        console.log('[Subscribe] 多条订阅请求成功:', res)
        const results: Record<string, boolean> = {}
        templateIds.forEach(id => {
          results[id] = res[id] === 'accept'
        })
        resolve(results)
      },
      fail: (err) => {
        console.error('[Subscribe] 多条订阅请求失败:', err)
        const results: Record<string, boolean> = {}
        templateIds.forEach(id => {
          results[id] = false
        })
        resolve(results)
      },
    })
    // #endif

    // #ifndef MP-WEIXIN
    const results: Record<string, boolean> = {}
    templateIds.forEach(id => {
      results[id] = false
    })
    resolve(results)
    // #endif
  })
}

/**
 * 请求所有推荐的消息订阅权限
 */
export async function requestAllNotifications(): Promise<boolean> {
  const templateIds = Object.values(MESSAGE_TEMPLATES)
  const results = await requestMultipleSubscribeMessages(templateIds)

  // 只要有一个授权成功就返回 true
  return Object.values(results).some(accepted => accepted)
}

/**
 * 检查用户是否已授权某类通知
 * @param notificationType 通知类型
 */
export async function checkNotificationPermission(
  notificationType: keyof typeof MESSAGE_TEMPLATES
): Promise<boolean> {
  // 微信不提供查询接口，只能通过本地缓存判断
  // 实际项目中需要在用户授权后记录到数据库
  const key = `subscribe_${notificationType}`
  return !!uni.getStorageSync(key)
}
