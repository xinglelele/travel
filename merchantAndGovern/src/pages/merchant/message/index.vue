<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="msg-tabs">
          <el-radio-group v-model="filterType" @change="fetchList">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="system">系统公告</el-radio-button>
            <el-radio-button value="user">互动提醒</el-radio-button>
            <el-radio-button value="gov">政府通知</el-radio-button>
          </el-radio-group>
          <el-button text @click="markAllRead">全部已读</el-button>
        </div>
      </template>

      <div class="msg-list">
        <div
          v-for="item in list"
          :key="item.id"
          class="msg-item"
          :class="{ unread: !item.isRead }"
          @click="openDetail(item)"
        >
          <div class="msg-icon-wrap">
            <el-icon class="msg-icon" :size="20">
              <Bell v-if="item.type === 'system'" />
              <ChatLineSquare v-else-if="item.type === 'user'" />
              <Warning v-else-if="item.type === 'gov'" />
              <Bell v-else />
            </el-icon>
          </div>
          <div class="msg-body">
            <div class="msg-title">{{ item.title }}</div>
            <div class="msg-content-preview">{{ item.content?.slice(0, 60) }}{{ item.content?.length > 60 ? '...' : '' }}</div>
            <div class="msg-time">{{ formatDate(item.createdAt) }}</div>
          </div>
          <div v-if="!item.isRead" class="unread-dot"></div>
        </div>

        <el-empty v-if="!loading && list.length === 0" description="暂无消息" />
      </div>

      <el-pagination
        v-if="total > 0"
        layout="total, prev, pager, next"
        :total="total"
        :page.sync="page"
        :page-size="pageSize"
        @current-change="fetchList"
        style="margin-top:20px;justify-content:center"
      />
    </el-card>

    <!-- 消息详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="currentMsg?.title" width="500px" destroy-on-close>
      <div class="msg-detail-content">{{ currentMsg?.content }}</div>
      <div class="msg-detail-time">{{ formatDate(currentMsg?.createdAt) }}</div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/api/request'
import { Bell, ChatLineSquare, Warning } from '@element-plus/icons-vue'

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterType = ref('')
const loading = ref(true)
const detailVisible = ref(false)
const currentMsg = ref<any>({})

async function fetchList() {
  loading.value = true
  try {
    // 商户消息接口需后端实现，此处模拟数据
    const res = await request.get('/merchant/message/list', { params: { type: filterType.value, page: page.value, pageSize: pageSize.value } })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    list.value = [
      { id: 1, title: '平台公告：系统升级通知', content: '尊敬商户您好，平台将于本周六凌晨2:00-4:00进行系统升级，届时服务暂时不可用，请知悉。', type: 'system', isRead: 0, createdAt: new Date().toISOString() },
      { id: 2, title: '用户提醒：张三评论了您的景点', content: '用户张三在您的景点发表了一条新评论，请及时查看并回复。', type: 'user', isRead: 1, createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 3, title: '政府通知：景点审核通过', content: '您的景点"外滩景区"已通过政府审核，正式上线。', type: 'gov', isRead: 0, createdAt: new Date(Date.now() - 172800000).toISOString() }
    ]
    total.value = list.value.length
  } finally { loading.value = false }
}

function openDetail(item: any) {
  currentMsg.value = item
  detailVisible.value = true
  if (!item.isRead) {
    item.isRead = 1
  }
}

async function markAllRead() {
  await request.put('/merchant/message/read-all')
  list.value.forEach(m => m.isRead = 1)
}

function formatDate(d: string) { return new Date(d).toLocaleString('zh-CN') }

onMounted(fetchList)
</script>

<style scoped>
.msg-tabs { display:flex; justify-content:space-between; align-items:center }
.msg-item {
  display:flex;
  gap:14px;
  padding:16px 0;
  border-bottom:1px solid #f0f0f0;
  cursor:pointer;
  transition:background 0.2s;
  position:relative;
}
.msg-item:hover { background:#fafafa }
.msg-item.unread { background:#f0f4ff }
.msg-icon-wrap { flex-shrink:0 }
.msg-icon { color:#667eea; margin-top:2px }
.msg-body { flex:1; min-width:0 }
.msg-title { font-size:14px; font-weight:600; color:#333; margin-bottom:6px }
.msg-content-preview { font-size:13px; color:#888; margin-bottom:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.msg-time { font-size:12px; color:#bbb }
.unread-dot { position:absolute; right:0; top:50%; transform:translateY(-50%); width:8px; height:8px; border-radius:50%; background:#667eea }
.msg-detail-content { font-size:14px; line-height:1.8; color:#333 }
.msg-detail-time { margin-top:16px; color:#999; font-size:12px }
</style>