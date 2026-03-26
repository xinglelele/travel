<template>
  <view class="poi-detail">
    <!-- 返回按钮（悬浮在图片上） -->
    <view class="back-btn" @tap="uni.navigateBack()">‹</view>

    <scroll-view scroll-y class="detail-scroll">
      <!-- 图片轮播（随内容滚动） -->
      <swiper class="img-swiper" autoplay circular indicator-dots indicator-active-color="#fff">
        <swiper-item v-for="(img, idx) in poi?.images" :key="idx">
          <image class="swiper-img" :src="img" mode="aspectFill" />
        </swiper-item>
      </swiper>

      <!-- 基础信息 -->
      <view class="info-card">
        <view class="info-header">
          <text class="poi-name">{{ poi?.name }}</text>
          <view class="rating-row">
            <AppIcon name="star" :size="36" />
            <text class="rating">{{ poi?.rating }}</text>
            <text class="comment-count">{{ poi?.commentCount }} {{ t('poi.comments') }}</text>
          </view>
        </view>

        <view class="info-row">
          <AppIcon name="clock" :size="40" class="info-icon-img" />
          <text class="info-text">{{ poi?.openTime || '全天开放' }}</text>
        </view>
        <view class="info-row">
          <AppIcon name="ticket" :size="40" class="info-icon-img" />
          <text class="info-text">{{ poi?.ticketPrice ? `¥${poi.ticketPrice}` : t('poi.free') }}</text>
        </view>
        <view class="info-row" @tap="copyAddress">
          <AppIcon name="locate" :size="40" class="info-icon-img" />
          <text class="info-text address">{{ poi?.address }}</text>
        </view>
        <view v-if="poi?.phone" class="info-row" @tap="callPhone">
          <AppIcon name="phone" :size="40" class="info-icon-img" />
          <text class="info-text link">{{ poi.phone }}</text>
        </view>
      </view>

      <!-- 简介 -->
      <view class="desc-card">
        <text class="card-title">{{ t('poi.description') }}</text>
        <text class="desc-text">{{ poi?.description }}</text>
      </view>

      <!-- 地图预览 -->
      <view class="map-card">
        <text class="card-title">{{ t('map.title') }}</text>
        <map
          v-if="poi"
          class="mini-map"
          :latitude="poi.latitude"
          :longitude="poi.longitude"
          :scale="15"
          :markers="[{ id: 0, latitude: poi.latitude, longitude: poi.longitude, title: poi.name, width: 32, height: 32 }]"
        />
      </view>

      <!-- 评论预览 -->
      <view class="comment-preview">
        <view class="section-header">
          <text class="card-title">{{ t('poi.comments') }}</text>
          <text class="view-all" @tap="goCommentList">{{ t('poi.viewAllComments') }}</text>
        </view>
        <view v-for="c in previewComments" :key="c.id" class="comment-item">
          <image class="c-avatar" :src="c.userAvatar" mode="aspectFill" />
          <view class="c-body">
            <text class="c-name">{{ c.userNickname }}</text>
            <text class="c-rating">{{ '⭐'.repeat(c.rating) }}</text>
            <text class="c-content">{{ c.content }}</text>
          </view>
        </view>
        <view v-if="previewComments.length === 0" class="empty-tip">{{ t('common.empty') }}</view>
      </view>

      <view class="bottom-space" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="action-bar">
      <view class="action-btn" @tap="onCheckIn">
        <AppIcon :name="checkedIn ? 'checkedIn' : 'checkin'" :size="56" />
        <text class="action-text">{{ checkedIn ? t('poi.checkedIn') : t('poi.checkIn') }}</text>
      </view>
      <view class="action-btn" @tap="goAddComment">
        <AppIcon name="edit" :size="56" />
        <text class="action-text">{{ t('poi.addComment') }}</text>
      </view>
      <view class="action-btn" @tap="onNavigate">
        <AppIcon name="navigate" :size="56" />
        <text class="action-text">{{ t('common.navigate') }}</text>
      </view>
      <view class="action-btn" @tap="onShare">
        <AppIcon name="share" :size="56" />
        <text class="action-text">{{ t('common.share') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { onLoad } from '@dcloudio/uni-app'
import { poiApi } from '../../api/poi'
import { commentApi } from '../../api/comment'
import { checkApi } from '../../api/check'
import type { POI } from '../../stores/poi'
import type { Comment } from '../../api/comment'
import AppIcon from '../../components/AppIcon.vue'

const { t } = useI18n()
const poi = ref<POI | null>(null)
const previewComments = ref<Comment[]>([])
const checkedIn = ref(false)
const poiId = ref('')
let loaded = false

onLoad((options) => {
  const id = options?.id || ''
  console.log('[POI Detail] onLoad id =', id)
  poiId.value = id
  loaded = true
  loadData(id)
})

onMounted(() => {
  // H5 环境 onLoad 不触发时兜底
  if (!loaded) {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as any
    const id = page?.$page?.options?.id || page?.options?.id || ''
    console.log('[POI Detail] onMounted fallback id =', id)
    poiId.value = id
    loadData(id)
  }
})

async function loadData(id: string) {
  console.log('[POI Detail] loadData id =', id)

  try {
    const result = await poiApi.detail(id)
    console.log('[POI Detail] POI:', result?.name)
    poi.value = result
  } catch (e) {
    console.error('[POI Detail] poiApi.detail 失败:', e)
  }

  try {
    // 评论用 mock 数据，id 匹配不到高德 id 时自动兜底返回全部 mock 评论
    const res = await commentApi.list({ poiId: id || 'poi-1', pageSize: 3 })
    console.log('[POI Detail] 评论数量:', res.list.length)
    previewComments.value = res.list
  } catch (e) {
    console.error('[POI Detail] commentApi.list 失败:', e)
  }
}

function copyAddress() {
  if (poi.value?.address) {
    uni.setClipboardData({ data: poi.value.address })
  }
}

function callPhone() {
  if (poi.value?.phone) {
    uni.makePhoneCall({ phoneNumber: poi.value.phone })
  }
}

async function onCheckIn() {
  if (checkedIn.value) return
  uni.getLocation({
    type: 'gcj02',
    success: async (res) => {
      try {
        await checkApi.create({ poiId: poiId.value, latitude: res.latitude, longitude: res.longitude })
        checkedIn.value = true
        uni.showToast({ title: t('check.checkSuccess'), icon: 'success' })
      } catch {}
    }
  })
}

function onNavigate() {
  if (!poi.value) return
  uni.openLocation({
    latitude: poi.value.latitude,
    longitude: poi.value.longitude,
    name: poi.value.name,
    address: poi.value.address || ''
  })
}

function onShare() {
  uni.showShareMenu({ withShareTicket: true })
}

function goCommentList() { uni.navigateTo({ url: `/pages/comment/list?poiId=${poiId.value}` }) }
function goAddComment() { uni.navigateTo({ url: `/pages/comment/create?poiId=${poiId.value}` }) }
</script>

<style scoped>
.poi-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.img-swiper {
  height: 480rpx;
  flex-shrink: 0;
}

.swiper-img {
  width: 100%;
  height: 480rpx;
}

.back-btn {
  position: absolute;
  top: calc(24rpx + var(--status-bar-height));
  left: 24rpx;
  width: 64rpx;
  height: 64rpx;
  background: rgba(0,0,0,0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #fff;
  z-index: 10;
}

.detail-scroll { flex: 1; overflow: hidden; }

.info-card, .desc-card, .map-card, .comment-preview {
  background: #fff;
  margin: 16rpx 24rpx;
  border-radius: 16rpx;
  padding: 28rpx;
}

.info-header {
  margin-bottom: 20rpx;
}

.poi-name {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
}

.rating { font-size: 28rpx; color: #fa8c16; font-weight: 600; }
.comment-count { font-size: 24rpx; color: #999; }

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.info-row:last-child { border-bottom: none; }

.info-icon-img { flex-shrink: 0; margin-top: 2rpx; }

.info-text {
  font-size: 26rpx;
  color: #555;
  flex: 1;
}

.info-text.address { color: #333; }
.info-text.link { color: #1890FF; }

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16rpx;
}

.desc-text {
  font-size: 26rpx;
  color: #555;
  line-height: 1.8;
}

.mini-map {
  width: 100%;
  height: 300rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.view-all {
  font-size: 26rpx;
  color: #1890FF;
}

.comment-item {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.comment-item:last-child { border-bottom: none; }

.c-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.c-name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
}

.c-rating {
  display: block;
  font-size: 22rpx;
  margin: 4rpx 0;
}

.c-content {
  display: block;
  font-size: 26rpx;
  color: #555;
}

.empty-tip {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: #ccc;
}

.bottom-space { height: 40rpx; }

.action-bar {
  flex-shrink: 0;
  background: #fff;
  display: flex;
  padding: 16rpx 0 calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.action-text {
  font-size: 22rpx;
  color: #666;
}
</style>
