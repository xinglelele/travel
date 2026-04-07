/**
 * 消息推送服务
 * 支持微信订阅消息发送
 */

import { prisma } from '../../config'

export interface PushMessageParams {
  userId: number
  type: 'system' | 'route' | 'comment' | 'activity'
  title: string
  content?: string
  relatedId?: number
}

/**
 * 创建消息记录
 */
export async function createMessage(params: PushMessageParams) {
  const { userId, type, title, content, relatedId } = params

  const message = await prisma.messageInfo.create({
    data: {
      userId,
      type,
      title,
      content: content || null,
      relatedId: relatedId || null,
      isRead: 0,
    },
  })

  return message
}

/**
 * 评论被回复时发送通知
 */
export async function notifyCommentReplied(
  originalCommentUserId: number,
  replierNickname: string,
  poiName: string,
  commentId: number
) {
  const poi = await prisma.poiInfo.findFirst({
    where: {
      comments: {
        some: { id: commentId }
      }
    },
    select: { poiName: true }
  })

  const displayName = poiName || (poi?.poiName && typeof poi.poiName === 'string'
    ? poi.poiName
    : (poi?.poiName as any)?.zh || '景点')

  return createMessage({
    userId: originalCommentUserId,
    type: 'comment',
    title: '评论收到回复',
    content: `${replierNickname} 回复了你在「${displayName}」的评论`,
    relatedId: commentId,
  })
}

/**
 * 路线被点赞时发送通知
 */
export async function notifyRouteLiked(
  routeOwnerUserId: number,
  likerNickname: string,
  routeName: string,
  routeId: number
) {
  return createMessage({
    userId: routeOwnerUserId,
    type: 'route',
    title: '路线收到点赞',
    content: `${likerNickname} 点赞了你的路线「${routeName}」`,
    relatedId: routeId,
  })
}

/**
 * 系统公告推送
 */
export async function notifySystemAnnouncement(
  targetUserIds: number[],
  title: string,
  content: string
) {
  const messages = await Promise.all(
    targetUserIds.map(userId =>
      createMessage({
        userId,
        type: 'system',
        title,
        content,
      })
    )
  )

  return messages
}

/**
 * 获取用户未读消息数量
 */
export async function getUnreadCount(userId: number): Promise<number> {
  return await prisma.messageInfo.count({
    where: {
      userId,
      isRead: 0,
    },
  })
}

/**
 * 标记单条消息已读
 */
export async function markAsRead(messageId: number, userId: number): Promise<boolean> {
  const message = await prisma.messageInfo.findFirst({
    where: {
      id: messageId,
      userId,
    },
  })

  if (!message) return false

  await prisma.messageInfo.update({
    where: { id: messageId },
    data: { isRead: 1 },
  })

  return true
}

/**
 * 标记全部消息已读
 */
export async function markAllAsRead(userId: number): Promise<number> {
  const result = await prisma.messageInfo.updateMany({
    where: {
      userId,
      isRead: 0,
    },
    data: { isRead: 1 },
  })

  return result.count
}
