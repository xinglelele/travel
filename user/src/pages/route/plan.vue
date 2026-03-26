<template>
  <view class="plan-page">
    <view class="page-header">
      <text class="page-title">{{ t('route.plan') }}</text>
    </view>

    <scroll-view scroll-y class="plan-scroll">
      <!-- 输入区域 -->
      <view class="input-card">
        <textarea
          class="plan-textarea"
          v-model="inputText"
          :placeholder="t('route.inputPlaceholder')"
          maxlength="500"
          auto-height
        />
        <view class="input-footer">
          <text class="char-count">{{ inputText.length }}/500</text>
          <view class="voice-btn" @tap="onVoiceInput">
            <text class="voice-icon">🎤</text>
            <text class="voice-text">{{ t('route.voiceInput') }}</text>
          </view>
        </view>
      </view>

      <!-- 快捷标签 -->
      <view class="tags-section">
        <text class="section-title">{{ t('route.quickTags') }}</text>
        <view class="tags-wrap">
          <view
            v-for="tag in quickTags"
            :key="tag.key"
            class="tag-chip"
            :class="{ active: selectedTags.includes(tag.key) }"
            @tap="toggleTag(tag.key)"
          >
            {{ t(`route.tags.${tag.key}`) }}
          </view>
        </view>
      </view>

      <!-- 历史记录 -->
      <view v-if="history.length > 0" class="history-section">
        <text class="section-title">{{ t('route.history') }}</text>
        <view v-for="(item, idx) in history" :key="idx" class="history-item" @tap="useHistory(item)">
          <text class="history-icon">🕐</text>
          <text class="history-text">{{ item }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 生成按钮 -->
    <view class="generate-area">
      <button
        class="generate-btn"
        :loading="generating"
        :disabled="!inputText.trim() && selectedTags.length === 0"
        @tap="onGenerate"
      >
        {{ generating ? t('route.generating') : t('route.generateBtn') }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouteStore } from '../../stores/route'
import { routeApi } from '../../api/route'

const { t } = useI18n()
const routeStore = useRouteStore()

const inputText = ref('')
const selectedTags = ref<string[]>([])
const generating = computed(() => routeStore.generating)
const history = computed(() => routeStore.generateHistory)

const quickTags = [
  { key: 'family' }, { key: 'couple' }, { key: 'solo' }, { key: 'group' },
  { key: 'budget' }, { key: 'luxury' }, { key: 'oneDay' }, { key: 'twoDay' }, { key: 'threeDay' }
]

function toggleTag(key: string) {
  const idx = selectedTags.value.indexOf(key)
  if (idx > -1) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(key)
}

function useHistory(item: string) {
  inputText.value = item
}

function onVoiceInput() {
  // 微信小程序语音识别
  const recorderManager = uni.getRecorderManager()
  recorderManager.start({ duration: 10000, format: 'mp3' })
  uni.showToast({ title: '录音中...', icon: 'none', duration: 3000 })
  setTimeout(() => {
    recorderManager.stop()
    uni.showToast({ title: '语音识别功能需接入语音API', icon: 'none' })
  }, 3000)
}

async function onGenerate() {
  const prompt = inputText.value.trim() || selectedTags.value.map(k => t(`route.tags.${k}`)).join('、')
  if (!prompt) return

  routeStore.setGenerating(true)
  routeStore.addHistory(prompt)

  try {
    uni.getLocation({
      type: 'gcj02',
      success: async (res) => {
        try {
          const route = await routeApi.generate({
            prompt,
            tags: selectedTags.value,
            startLatitude: res.latitude,
            startLongitude: res.longitude
          })
          routeStore.setCurrentRoute(route)
          routeStore.addRoute(route)
          uni.navigateTo({ url: `/pages/route/detail?id=${route.id}` })
        } catch {} finally {
          routeStore.setGenerating(false)
        }
      },
      fail: async () => {
        try {
          const route = await routeApi.generate({ prompt, tags: selectedTags.value })
          routeStore.setCurrentRoute(route)
          routeStore.addRoute(route)
          uni.navigateTo({ url: `/pages/route/detail?id=${route.id}` })
        } catch {} finally {
          routeStore.setGenerating(false)
        }
      }
    })
  } catch {
    routeStore.setGenerating(false)
  }
}

onMounted(() => routeStore.loadHistory())
</script>

<style scoped>
.plan-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.page-header {
  padding: 20rpx 32rpx;
  padding-top: calc(20rpx + var(--status-bar-height));
  background: #fff;
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.plan-scroll { flex: 1; padding: 24rpx; }

.input-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.plan-textarea {
  width: 100%;
  min-height: 200rpx;
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.char-count { font-size: 24rpx; color: #ccc; }

.voice-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 20rpx;
  background: #f5f7fa;
  border-radius: 40rpx;
}

.voice-icon { font-size: 28rpx; }
.voice-text { font-size: 24rpx; color: #666; }

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.tags-section, .history-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-chip {
  padding: 12rpx 28rpx;
  border-radius: 40rpx;
  border: 2rpx solid #e8e8e8;
  font-size: 26rpx;
  color: #666;
  background: #fafafa;
}

.tag-chip.active {
  border-color: #1890FF;
  color: #1890FF;
  background: #e6f4ff;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.history-item:last-child { border-bottom: none; }

.history-icon { font-size: 28rpx; color: #ccc; }

.history-text {
  font-size: 26rpx;
  color: #555;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.generate-area {
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
}

.generate-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #1890FF, #52C41A);
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
}

.generate-btn[disabled] {
  background: #d9d9d9;
  color: #fff;
}
</style>
