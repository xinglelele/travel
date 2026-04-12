<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="layout-aside">
      <div class="logo-area">
        <img v-if="merchantStore.merchantInfo?.logo" :src="merchantStore.merchantInfo.logo" class="logo-img" />
        <div v-else class="logo-icon">商</div>
        <span class="logo-text">{{ merchantStore.merchantInfo?.merchantName || '商户端' }}</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        background-color="#1a1a2e"
        text-color="#a0a5b8"
        active-text-color="#fff"
        :router="true"
      >
        <el-menu-item index="/merchant/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>运营概览</span>
        </el-menu-item>
        <el-menu-item index="/merchant/poi">
          <el-icon><Location /></el-icon>
          <span>景点信息</span>
        </el-menu-item>
        <el-menu-item index="/merchant/ticket">
          <el-icon><Tickets /></el-icon>
          <span>票务管理</span>
        </el-menu-item>
        <el-menu-item index="/merchant/comment">
          <el-icon><ChatLineSquare /></el-icon>
          <span>评价管理</span>
          <el-badge v-if="pendingReplyCount > 0" :value="pendingReplyCount" class="menu-badge" />
        </el-menu-item>
        <el-menu-item index="/merchant/message">
          <el-icon><Bell /></el-icon>
          <span>消息通知</span>
        </el-menu-item>
        <el-menu-item index="/merchant/stats">
          <el-icon><TrendCharts /></el-icon>
          <span>数据分析</span>
        </el-menu-item>
        <el-menu-item index="/merchant/settings">
          <el-icon><Setting /></el-icon>
          <span>账号设置</span>
        </el-menu-item>
      </el-menu>

      <div class="logout-area" @click="handleLogout">
        <el-icon><SwitchButton /></el-icon>
        <span>退出登录</span>
      </div>
    </el-aside>

    <!-- 主体区 -->
    <el-container>
      <!-- 顶部栏 -->
      <el-header class="layout-header">
        <div class="header-left">
          <span class="page-title">{{ currentRouteTitle }}</span>
        </div>
        <div class="header-right">
          <el-tag v-if="merchantStore.merchantInfo?.status === 0" type="warning" size="small">待审核</el-tag>
          <el-tag v-else-if="merchantStore.merchantInfo?.status === 1" type="success" size="small">正常</el-tag>
          <span class="merchant-tel">{{ merchantStore.merchantInfo?.tel }}</span>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMerchantStore } from '@/stores/merchant'
import { merchantLogout } from '@/api/modules/merchant'
import { ElMessage } from 'element-plus'
import {
  DataLine, Location, Tickets, ChatLineSquare,
  Bell, TrendCharts, Setting, SwitchButton
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const merchantStore = useMerchantStore()

const pendingReplyCount = ref(0)

const activeMenu = computed(() => route.path)
const currentRouteTitle = computed(() => (route.meta.title as string) || '')

async function handleLogout() {
  try {
    await merchantLogout()
  } catch { /* ignore */ }
  merchantStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  background: #f5f6fa;
}

.layout-aside {
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.logo-img {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
}

.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.logo-text {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
}

.sidebar-menu :deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: rgba(102, 126, 234, 0.2) !important;
  border-right: 3px solid #667eea;
}

.menu-badge {
  margin-left: 6px;
}

.logout-area {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #a0a5b8;
  cursor: pointer;
  font-size: 13px;
  border-top: 1px solid rgba(255,255,255,0.08);
  transition: color 0.2s;
}

.logout-area:hover {
  color: #f56c6c;
}

.layout-header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid #f0f0f0;
  height: 60px;
}

.header-left .page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.merchant-tel {
  font-size: 13px;
  color: #666;
}

.layout-main {
  padding: 0;
  overflow-y: auto;
  background: #f5f6fa;
}
</style>