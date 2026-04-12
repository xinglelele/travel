<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="asideWidth" class="layout-aside" :class="{ collapsed: asideCollapsed }">
      <div class="logo-area">
        <div class="logo-icon">政</div>
        <span v-show="!asideCollapsed" class="logo-text">政府监管端</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        background-color="#1a1a2e"
        text-color="#a0a5b8"
        active-text-color="#fff"
        :router="true"
        :collapse="asideCollapsed"
        :collapse-transition="false"
      >
        <el-menu-item index="/gov/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>运营概览</span>
        </el-menu-item>
        <el-menu-item index="/gov/poi/audit">
          <el-icon><DocumentChecked /></el-icon>
          <span>POI 审核</span>
          <el-badge v-if="pendingPoiAudit > 0" :value="pendingPoiAudit" class="menu-badge" />
        </el-menu-item>
        <el-menu-item index="/gov/poi">
          <el-icon><Location /></el-icon>
          <span>景点管理</span>
        </el-menu-item>
        <el-menu-item index="/gov/merchant">
          <el-icon><OfficeBuilding /></el-icon>
          <span>商户管理</span>
        </el-menu-item>
        <el-menu-item index="/gov/comment/audit">
          <el-icon><ChatDotSquare /></el-icon>
          <span>评论审核</span>
          <el-badge v-if="pendingCommentAudit > 0" :value="pendingCommentAudit" class="menu-badge" />
        </el-menu-item>
        <el-menu-item index="/gov/report">
          <el-icon><WarnTriangleFilled /></el-icon>
          <span>举报处理</span>
        </el-menu-item>
        <el-menu-item index="/gov/content">
          <el-icon><Reading /></el-icon>
          <span>内容管理</span>
        </el-menu-item>
        <el-menu-item index="/gov/announcement">
          <el-icon><Bell /></el-icon>
          <span>系统公告</span>
        </el-menu-item>
        <el-menu-item index="/gov/stats">
          <el-icon><TrendCharts /></el-icon>
          <span>数据分析</span>
        </el-menu-item>
        <el-menu-item v-if="govStore.isSuperAdmin()" index="/gov/admin">
          <el-icon><User /></el-icon>
          <span>账号管理</span>
        </el-menu-item>
        <el-menu-item index="/gov/settings">
          <el-icon><Setting /></el-icon>
          <span>账号设置</span>
        </el-menu-item>
      </el-menu>

      <div class="logout-area" @click="handleLogout">
        <el-icon><SwitchButton /></el-icon>
        <span v-show="!asideCollapsed">退出登录</span>
      </div>
    </el-aside>

    <!-- 主体区 -->
    <el-container>
      <!-- 顶部栏 -->
      <el-header class="layout-header">
        <div class="header-left">
          <el-button
            class="aside-toggle"
            text
            circle
            :aria-label="asideCollapsed ? '展开侧栏' : '收起侧栏'"
            @click="asideCollapsed = !asideCollapsed"
          >
            <el-icon :size="18">
              <Fold v-if="!asideCollapsed" />
              <Expand v-else />
            </el-icon>
          </el-button>
          <span class="page-title">{{ currentRouteTitle }}</span>
        </div>
        <div class="header-right">
          <el-tooltip
            :content="isMainFullscreen ? '退出全屏（Esc）' : `全屏当前页：${currentRouteTitle || '内容区'}`"
            placement="bottom"
          >
            <el-button
              class="main-fs-btn"
              text
              circle
              :aria-label="isMainFullscreen ? '退出全屏' : '主内容区全屏'"
              @click="toggleMainFullscreen"
            >
              <el-icon :size="18">
                <FullScreen v-if="!isMainFullscreen" />
                <Close v-else />
              </el-icon>
            </el-button>
          </el-tooltip>
          <el-tag v-if="govStore.isSuperAdmin()" type="danger" size="small">超级管理员</el-tag>
          <el-tag v-else-if="govStore.isAdmin()" type="warning" size="small">管理员</el-tag>
          <el-tag v-else type="info" size="small">审核员</el-tag>
          <span class="gov-name">{{ govStore.govInfo?.realName || govStore.govInfo?.username }}</span>
          <span class="gov-dept">{{ govStore.govInfo?.department }}</span>
        </div>
      </el-header>

      <!-- 内容区：全屏仅包裹 router-view，侧栏与顶栏标题栏不参与 -->
      <el-main class="layout-main">
        <div ref="mainContentRef" class="layout-main-inner">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGovernmentStore } from '@/stores/government'
import { govLogout } from '@/api/modules/government'
import { ElMessage } from 'element-plus'
import {
  DataLine, DocumentChecked, Location, OfficeBuilding,
  ChatDotSquare, WarnTriangleFilled, Reading, Bell,
  TrendCharts, User, Setting, SwitchButton, Fold, Expand,
  FullScreen, Close
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const govStore = useGovernmentStore()

const mainContentRef = ref<HTMLElement | null>(null)
const isMainFullscreen = ref(false)

const asideCollapsed = ref(false)
const asideWidth = computed(() => (asideCollapsed.value ? '64px' : '220px'))

const pendingPoiAudit = ref(0)
const pendingCommentAudit = ref(0)

const activeMenu = computed(() => route.path)
const currentRouteTitle = computed(() => (route.meta.title as string) || '')

async function handleLogout() {
  try {
    await govLogout()
  } catch { /* ignore */ }
  govStore.logout()
  router.push({ path: '/login', query: { portal: 'gov' } })
}

function syncMainFullscreen() {
  const el = mainContentRef.value
  isMainFullscreen.value = !!(el && document.fullscreenElement === el)
}

async function toggleMainFullscreen() {
  const el = mainContentRef.value
  if (!el) return
  try {
    if (document.fullscreenElement === el) {
      await document.exitFullscreen()
    } else {
      await el.requestFullscreen()
    }
  } catch {
    /* 浏览器策略或不可用 */
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', syncMainFullscreen)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', syncMainFullscreen)
  const el = mainContentRef.value
  if (el && document.fullscreenElement === el) {
    document.exitFullscreen().catch(() => {})
  }
})
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
  transition: width 0.2s ease;
}

.layout-aside.collapsed .logo-area {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}

.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e74c3c, #c0392b);
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
  background: rgba(231, 76, 60, 0.2) !important;
  border-right: 3px solid #e74c3c;
}

.menu-badge {
  margin-left: 6px;
}

.logout-area {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #a0a5b8;
  cursor: pointer;
  font-size: 13px;
  border-top: 1px solid rgba(255,255,255,0.08);
  transition: color 0.2s;
}

.layout-aside:not(.collapsed) .logout-area {
  justify-content: flex-start;
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

.header-left {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.aside-toggle {
  color: #606266;
  flex-shrink: 0;
}

.aside-toggle:hover {
  color: #e74c3c;
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

.gov-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.gov-dept {
  font-size: 12px;
  color: #888;
}

.layout-main {
  padding: 0;
  overflow-y: auto;
  background: #f5f6fa;
}

.layout-main-inner {
  min-height: 100%;
  box-sizing: border-box;
}

.layout-main-inner:fullscreen {
  background: #f5f6fa;
  overflow: auto;
}

.layout-main-inner:-webkit-full-screen {
  background: #f5f6fa;
  overflow: auto;
}

.main-fs-btn {
  color: #606266;
  flex-shrink: 0;
}

.main-fs-btn:hover {
  color: #e74c3c;
}
</style>