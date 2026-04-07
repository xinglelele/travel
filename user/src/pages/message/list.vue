<template>
  <view class="message-list">
    <view class="page-header">
      <text class="page-title">{{ t('message.title') }}</text>
      <text v-if="unreadCount > 0" class="mark-all" @tap="onMarkAllRead">{{ t('message.markAllRead') }}</text>
    </view>

    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view v-if="messages.length === 0 && !loading" class="empty-state">
        <AppIcon name="bell" :size="120" />
        <text class="empty-text">{{ t('message.noMessages') }}</text>
      </view>

      <view
        v-for="msg in messages"
        :key="msg.id"
        class="msg-item"
        :class="{ unread: !msg.isRead }"
        @tap="onMsgTap(msg)"
      >
        <view class="msg-icon-wrap">
          <AppIcon :name="getTypeIcon(msg.type)" :size="64" />
          <view v-if="!msg.isRead" class="unread-dot" />
        </view>
        <view class="msg-body">
          <view class="msg-header">
            <text class="msg-title">{{ msg.title }}</text>
            <text class="msg-time">{{ formatTime(msg.createdAt) }}</text>
          </view>
          <text class="msg-content">{{ msg.content }}</text>
        </view>
      </view>

      <view v-if="noMore && messages.length > 0" class="no-more">{{ t('common.noMore') }}</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessageStore } from '../../stores/message'
import { useUserStore } from '../../stores/user'
import { messageApi } from '../../api/message'
import type { Message } from '../../stores/message'
import AppIcon from '../../components/AppIcon.vue'
import type { IconName } from '../../utils/icons'

const { t } = useI18n()
const messageStore = useMessageStore()
const userStore = useUserStore()

const loading = ref(false)
const page = ref(1)
const noMore = ref(false)

const messages = computed(() => messageStore.messages)
const unreadCount = computed(() => messageStore.unreadCount)

function getTypeIcon(type: string): IconName {
  const icons: Record<string, IconName> = {
    system: 'msg-system', route: 'msg-route', comment: 'msg-comment', activity: 'msg-activity'
  }
  return icons[type] || 'msg-default'
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return dateStr.slice(0, 10)
}

async function loadData(reset = false) {
  if (loading.value) return
  // 未登录时不请求消息列表
  if (!userStore.isLoggedIn) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const res = await messageApi.list({ page: page.value, pageSize: 20 })
    if (reset) messageStore.setMessages(res.list)
    else messageStore.setMessages([...messageStore.messages, ...res.list])
    if (res.list.length < 20) noMore.value = true
  } catch {} finally {
    loading.value = false
  }
}

function loadMore() {
  if (noMore.value) return
  page.value++
  loadData()
}

async function onMarkAllRead() {
  try {
    await messageApi.readAll()
    messageStore.markAllRead()
  } catch {}
}

async function onMsgTap(msg: Message) {
  if (!msg.isRead) {
    try {
      await messageApi.read(msg.id)
      messageStore.markRead(msg.id)
    } catch {}
  }
}

onMounted(() => loadData(true))
</script>

<style scoped>
.message-list {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
  padding-top: calc(20rpx + var(--status-bar-height));
  background: #fff;
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.mark-all {
  font-size: 26rpx;
  color: #1890FF;
}

.list-scroll { flex: 1; padding: 16rpx 24rpx; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.empty-text { font-size: 28rpx; color: #999; }

.msg-item {
  display: flex;
  gap: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.msg-item.unread {
  background: #f0f7ff;
}

.msg-icon-wrap {
  position: relative;
  flex-shrink: 0;
}

.unread-dot {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  width: 16rpx;
  height: 16rpx;
  background: #ff4d4f;
  border-radius: 50%;
}

.msg-body { flex: 1; }

.msg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.msg-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.msg-time {
  font-size: 22rpx;
  color: #ccc;
}

.msg-content {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

.no-more {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: #ccc;
}
</style>
