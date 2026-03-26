<template>
  <view class="create-comment">
    <view class="page-header">
      <text class="page-title">{{ t('comment.create') }}</text>
    </view>

    <scroll-view scroll-y class="form-scroll">
      <!-- 星级评分 -->
      <view class="rating-card">
        <text class="card-label">{{ t('comment.rating') }}</text>
        <view class="stars">
          <text
            v-for="i in 5"
            :key="i"
            class="star"
            :class="{ active: i <= rating }"
            @tap="rating = i"
          >★</text>
        </view>
      </view>

      <!-- 文本输入 -->
      <view class="text-card">
        <textarea
          class="comment-textarea"
          v-model="content"
          :placeholder="t('comment.placeholder')"
          maxlength="500"
          auto-height
        />
        <text class="char-count">{{ content.length }}/500</text>
      </view>

      <!-- 图片上传 -->
      <view class="photo-card">
        <text class="card-label">{{ t('comment.uploadPhoto') }}</text>
        <view class="photo-grid">
          <view v-for="(img, idx) in images" :key="idx" class="photo-item">
            <image class="photo-img" :src="img" mode="aspectFill" />
            <view class="photo-del" @tap="removeImage(idx)">✕</view>
          </view>
          <view v-if="images.length < 9" class="photo-add" @tap="chooseImage">
            <text class="add-icon">+</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="submit-area">
      <button class="submit-btn" :loading="submitting" @tap="onSubmit">{{ t('common.submit') }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onLoad } from '@dcloudio/uni-app'
import { commentApi } from '../../api/comment'

const { t } = useI18n()
const rating = ref(5)
const content = ref('')
const images = ref<string[]>([])
const submitting = ref(false)
const poiId = ref('')

onLoad((options) => {
  poiId.value = options?.poiId || ''
})

function chooseImage() {
  uni.chooseImage({
    count: 9 - images.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      images.value.push(...res.tempFilePaths)
    }
  })
}

function removeImage(idx: number) {
  images.value.splice(idx, 1)
}

async function onSubmit() {
  if (!content.value.trim()) {
    uni.showToast({ title: '请输入评论内容', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await commentApi.create({ poiId: poiId.value, rating: rating.value, content: content.value, images: images.value })
    uni.showToast({ title: '评论成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch {} finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.create-comment {
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

.form-scroll { flex: 1; padding: 24rpx; }

.rating-card, .text-card, .photo-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.card-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 20rpx;
}

.stars {
  display: flex;
  gap: 16rpx;
}

.star {
  font-size: 56rpx;
  color: #e8e8e8;
  transition: color 0.2s;
}

.star.active { color: #faad14; }

.comment-textarea {
  width: 100%;
  min-height: 200rpx;
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #ccc;
  margin-top: 12rpx;
}

.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.photo-item {
  position: relative;
  width: 180rpx;
  height: 180rpx;
}

.photo-img {
  width: 180rpx;
  height: 180rpx;
  border-radius: 8rpx;
}

.photo-del {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
}

.photo-add {
  width: 180rpx;
  height: 180rpx;
  border: 2rpx dashed #d9d9d9;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-icon {
  font-size: 60rpx;
  color: #ccc;
}

.submit-area {
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #1890FF;
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
}
</style>
