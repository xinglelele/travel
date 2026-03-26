<template>
  <view class="content-detail">
    <view class="page-header">
      <text class="page-title">{{ content?.title }}</text>
    </view>

    <scroll-view scroll-y class="detail-scroll">
      <!-- 封面 -->
      <image v-if="content?.cover" class="cover-img" :src="content.cover" mode="aspectFill" />

      <!-- 视频 -->
      <video v-if="content?.videoUrl" class="content-video" :src="content.videoUrl" controls />

      <!-- 元信息 -->
      <view class="meta-bar">
        <text class="meta-item">👁 {{ content?.viewCount }}</text>
        <text class="meta-item">❤️ {{ content?.likeCount }}</text>
        <text class="meta-date">{{ content?.createdAt?.slice(0, 10) }}</text>
      </view>

      <!-- 标签 -->
      <view v-if="content?.tags?.length" class="tags-row">
        <text v-for="tag in content.tags" :key="tag" class="tag-badge"># {{ tag }}</text>
      </view>

      <!-- 富文本内容 -->
      <view class="rich-content">
        <rich-text :nodes="content?.body || ''" />
      </view>

      <!-- 关联景点 -->
      <view v-if="relatedPois.length > 0" class="related-section">
        <text class="section-title">相关景点</text>
        <view v-for="poi in relatedPois" :key="poi.id" class="related-poi" @tap="goPoi(poi.id)">
          <image class="poi-img" :src="poi.images[0]" mode="aspectFill" />
          <view class="poi-info">
            <text class="poi-name">{{ poi.name }}</text>
            <text class="poi-rating">⭐ {{ poi.rating }}</text>
          </view>
          <text class="poi-arrow">›</text>
        </view>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { contentApi } from '../../api/content'
import { poiApi } from '../../api/poi'
import type { Content } from '../../api/content'
import type { POI } from '../../stores/poi'

const content = ref<Content | null>(null)
const relatedPois = ref<POI[]>([])

const pages = getCurrentPages()
const currentPage = pages[pages.length - 1] as { options?: { id?: string } }
const contentId = currentPage.options?.id || ''

async function loadData() {
  try {
    content.value = await contentApi.detail(contentId)
    contentApi.view(contentId)
    // 加载关联景点
    if (content.value?.relatedPoiIds?.length) {
      const poiPromises = content.value.relatedPoiIds.map(id => poiApi.detail(id))
      relatedPois.value = await Promise.all(poiPromises)
    }
  } catch {}
}

function goPoi(id: string) { uni.navigateTo({ url: `/pages/poi/detail?id=${id}` }) }

onMounted(() => loadData())
</script>

<style scoped>
.content-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.page-header {
  padding: 20rpx 32rpx;
  padding-top: calc(20rpx + var(--status-bar-height));
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-scroll { flex: 1; }

.cover-img {
  width: 100%;
  height: 400rpx;
}

.content-video {
  width: 100%;
  height: 400rpx;
}

.meta-bar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.meta-item {
  font-size: 24rpx;
  color: #999;
}

.meta-date {
  margin-left: auto;
  font-size: 24rpx;
  color: #ccc;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 16rpx 32rpx;
}

.tag-badge {
  font-size: 22rpx;
  color: #1890FF;
  background: #e6f4ff;
  padding: 4rpx 16rpx;
  border-radius: 40rpx;
}

.rich-content {
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #333;
  line-height: 1.8;
}

.related-section {
  padding: 24rpx 32rpx;
  border-top: 16rpx solid #f5f7fa;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16rpx;
}

.related-poi {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.related-poi:last-child { border-bottom: none; }

.poi-img {
  width: 100rpx;
  height: 80rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.poi-info { flex: 1; }

.poi-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.poi-rating {
  display: block;
  font-size: 22rpx;
  color: #fa8c16;
  margin-top: 4rpx;
}

.poi-arrow {
  font-size: 36rpx;
  color: #ccc;
}

.bottom-space { height: 60rpx; }
</style>
