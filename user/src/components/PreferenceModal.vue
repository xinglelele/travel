<template>
  <view v-if="visible" class="pref-mask" @tap.stop>
    <view class="pref-modal">
      <!-- 标题 + 步骤指示器 -->
      <view class="pref-header">
        <text class="pref-skip" @tap="onSkip">{{ t('preference.skip') }}</text>
        <text class="pref-title">{{ t('preference.title') }}</text>
        <text class="pref-subtitle">{{ stepLabels[step - 1] }}</text>
        <view class="pref-steps">
          <view v-for="i in 3" :key="i" class="step-dot" :class="{ active: step >= i, current: step === i }" />
        </view>
        <text class="step-counter">{{ step }}/3</text>
      </view>

      <!-- Step 1: 国籍选择（单选） -->
      <view v-if="step == 1" class="pref-body">
        <view class="tag-grid">
          <view
            v-for="item in nationalities"
            :key="item.key"
            class="tag-item"
            :class="{ selected: nationality === item.key }"
            @tap="nationality = item.key"
          >
            <AppIcon :name="item.icon as any" :size="60" />
            <text class="tag-text">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- Step 2: 活动强度（单选） -->
      <view v-if="step == 2" class="pref-body">
        <view class="tag-grid">
          <view
            v-for="item in intensities"
            :key="item.key"
            class="tag-item intensity-item"
            :class="{ selected: intensity === item.key }"
            @tap="intensity = item.key"
          >
            <AppIcon :name="item.icon as any" :size="60" />
            <text class="tag-text">{{ item.label }}</text>
            <text class="tag-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- Step 3: 旅游偏好标签（多选，至少1个） -->
      <view v-if="step == 3" class="pref-body">
        <view class="tag-grid">
          <view
            v-for="item in interestOptions"
            :key="item.key"
            class="tag-item"
            :class="{ selected: selectedInterests.includes(item.key) }"
            @tap="toggleInterest(item.key)"
          >
            <AppIcon :name="item.icon as any" :size="60" />
            <text class="tag-text">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="pref-footer">
        <button v-if="step > 1" class="back-btn" @tap="step -= 1">{{ t('preference.back') }}</button>
        <button class="next-btn" :class="{ full: step == 1 }" @tap="onNext">
          {{ step < 3 ? t('preference.next') : t('preference.finish') }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../stores/user'
import { userApi } from '../api/user'
import AppIcon from './AppIcon.vue'

const { t } = useI18n()
const userStore = useUserStore()

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'done'): void }>()

const step = ref(1)
const nationality = ref('')
const intensity = ref('')
const selectedInterests = ref<string[]>([])

const stepLabels = [
  '您来自哪里？',
  '您偏好哪种活动强度？',
  '您对哪些类型感兴趣？（可多选）'
]

const nationalities = [
  { key: 'cn_local', icon: 'nat-city', label: '上海本地' },
  { key: 'cn_other', icon: 'nat-cn', label: '中国其他' },
  { key: 'jp', icon: 'nat-jp', label: '日本' },
  { key: 'kr', icon: 'nat-kr', label: '韩国' },
  { key: 'us', icon: 'nat-us', label: 'Western' },
  { key: 'other', icon: 'nat-other', label: '其他' },
]

const intensities = [
  { key: 'easy', icon: 'intensity-easy', label: '轻松', desc: '慢节奏，少走路' },
  { key: 'moderate', icon: 'intensity-moderate', label: '适中', desc: '每天3-5个景点' },
  { key: 'intensive', icon: 'intensity-intensive', label: '紧凑', desc: '充分利用每一天' },
]

const interestOptions = [
  { key: 'history', icon: 'interest-history', label: '历史建筑' },
  { key: 'nature', icon: 'interest-nature', label: '自然风光' },
  { key: 'food', icon: 'interest-food', label: '美食探店' },
  { key: 'coffee', icon: 'interest-coffee', label: '咖啡文化' },
  { key: 'art', icon: 'interest-art', label: '艺术展览' },
  { key: 'shopping', icon: 'interest-shopping', label: '购物' },
  { key: 'photography', icon: 'interest-photography', label: '摄影打卡' },
  { key: 'nightlife', icon: 'interest-nightlife', label: '夜游夜景' },
]

function toggleInterest(key: string) {
  const idx = selectedInterests.value.indexOf(key)
  if (idx > -1) selectedInterests.value.splice(idx, 1)
  else selectedInterests.value.push(key)
}

function applyLocaleByNationality(nat: string) {
  const map: Record<string, string> = {
    jp: 'en', kr: 'en', us: 'en', cn_local: 'zh-CN', cn_other: 'zh-CN', other: 'en'
  }
  userStore.setLocale(map[nat] || 'zh-CN')
}

async function onNext() {
  if (step.value === 1) {
    if (!nationality.value) { uni.showToast({ title: '请选择国籍', icon: 'none' }); return }
    applyLocaleByNationality(nationality.value)
    step.value++
    return
  }
  if (step.value === 2) {
    if (!intensity.value) { uni.showToast({ title: '请选择活动强度', icon: 'none' }); return }
    step.value++
    return
  }
  if (selectedInterests.value.length === 0) { uni.showToast({ title: '请至少选择一个偏好', icon: 'none' }); return }
  const pref = {
    travelType: [nationality.value],
    interests: selectedInterests.value,
    transports: [intensity.value]
  }
  try {
    await userApi.preference(pref)
    userStore.setPreference(pref)
  } catch {
    userStore.setPendingPreference(pref)
  }
  emit('done')
}

function onSkip() {
  uni.setStorageSync('prefSkipped', true)
  emit('close')
}
</script>

<style scoped>
.pref-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: stretch;
  z-index: 999;
}

.pref-modal {
  width: 100%;
  background: #fff;
  padding: 60rpx 32rpx 60rpx;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.pref-header {
  text-align: center;
  margin-bottom: 36rpx;
  position: relative;
}

.pref-skip {
  position: absolute;
  right: 0;
  top: 0;
  font-size: 26rpx;
  color: #999;
  padding: 8rpx;
}

.pref-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12rpx;
}

.pref-subtitle {
  display: block;
  font-size: 28rpx;
  color: #555;
  margin-bottom: 20rpx;
}

.pref-steps {
  display: flex;
  justify-content: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.step-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #e0e0e0;
}

.step-dot.active { background: #1890FF; }
.step-dot.current { width: 32rpx; border-radius: 8rpx; }

.step-counter {
  font-size: 24rpx;
  color: #bbb;
}

.pref-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.tag-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: calc(33.33% - 14rpx);
  padding: 20rpx 0;
  border-radius: 16rpx;
  border: 2rpx solid #e8e8e8;
  background: #fafafa;
  box-sizing: border-box;
}

.tag-item.selected {
  border-color: #1890FF;
  background: #e6f4ff;
}

.intensity-item {
  width: calc(33.33% - 14rpx);
  padding: 28rpx 12rpx;
  box-sizing: border-box;
}

.tag-text {
  font-size: 24rpx;
  color: #333;
  text-align: center;
  margin-top: 8rpx;
}

.tag-item.selected .tag-text { color: #1890FF; font-weight: 500; }

.tag-desc {
  font-size: 20rpx;
  color: #999;
  margin-top: 6rpx;
  text-align: center;
  padding: 0 8rpx;
}

.pref-footer {
  display: flex;
  gap: 20rpx;
  margin-top: 48rpx;
  align-items: center;
}

.back-btn {
  width: 160rpx;
  min-width: 160rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: #f5f5f5;
  color: #666;
  border-radius: 44rpx;
  font-size: 28rpx;
  border: none;
  flex-shrink: 0;
}

.next-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  background: #1890FF;
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
}

.next-btn.full {
  width: 100%;
}
</style>
