<template>
  <div class="page-container">
    <!-- 统计卡片 -->
    <div class="stats-summary">
      <el-card shadow="never" class="stat-mini-card">
        <el-statistic title="总体评分" :value="stats.avgRating" :precision="1" />
      </el-card>
      <el-card shadow="never" class="stat-mini-card">
        <el-statistic title="总评价数" :value="stats.totalComments" />
      </el-card>
      <el-card shadow="never" class="stat-mini-card">
        <el-statistic title="本月新增" :value="stats.monthNewComments" />
      </el-card>
      <el-card shadow="never" class="stat-mini-card">
        <el-statistic title="待回复" :value="stats.pendingReplyCount">
          <template #suffix>
            <el-tag v-if="stats.pendingReplyCount > 0" type="danger" size="small" style="margin-left:6px">需回复</el-tag>
          </template>
        </el-statistic>
      </el-card>
    </div>

    <el-card shadow="never">
      <template #header>
        <div class="filter-bar">
          <el-radio-group v-model="filterRating" @change="fetchList">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="5">5星</el-radio-button>
            <el-radio-button value="4">4星</el-radio-button>
            <el-radio-button value="3">3星</el-radio-button>
            <el-radio-button value="2">2星</el-radio-button>
            <el-radio-button value="1">1星</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <div class="comment-list">
        <div v-for="item in list" :key="item.id" class="comment-item">
          <div class="comment-header">
            <div class="user-info">
              <el-avatar :src="item.userAvatar" :size="36">{{ item.userNickname?.[0] }}</el-avatar>
              <div>
                <div class="nickname">{{ item.userNickname }}</div>
                <el-rate v-model="item.rating" disabled text-color="#ff9900" />
              </div>
            </div>
            <div class="comment-meta">{{ formatDate(item.createdAt) }}</div>
          </div>
          <div class="comment-content">{{ item.content }}</div>
          <div v-if="item.images?.length" class="comment-images">
            <el-image
              v-for="(img, i) in item.images"
              :key="i"
              :src="img"
              style="width:80px;height:80px;border-radius:6px;margin-right:8px;object-fit:cover"
              :preview-src-list="item.images"
            />
          </div>
          <div class="reply-section">
            <div v-if="item.merchantReply" class="merchant-reply">
              <span class="reply-label">商家回复：</span>{{ item.merchantReply }}
              <span class="reply-time">{{ formatDate(item.replyTime) }}</span>
            </div>
            <div v-else class="no-reply">
              <el-button type="primary" text size="small" @click="openReplyDialog(item)">回复评价</el-button>
            </div>
          </div>
          <div class="comment-actions">
            <el-button type="primary" text size="small" @click="$router.push(`/merchant/comment/${item.id}`)">查看详情</el-button>
          </div>
        </div>

        <el-empty v-if="!loading && list.length === 0" />

        <el-pagination
          v-if="total > 0"
          layout="total, prev, pager, next"
          :total="total"
          :page.sync="page"
          :page-size="pageSize"
          @current-change="fetchList"
          style="margin-top:20px;justify-content:center"
        />
      </div>
    </el-card>

    <!-- 回复弹窗 -->
    <el-dialog v-model="replyDialogVisible" title="回复评价" width="500px" destroy-on-close>
      <el-input v-model="replyContent" type="textarea" :rows="4" placeholder="请输入回复内容（1-500字）" />
      <template #footer>
        <el-button @click="replyDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleReply">提交回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getCommentList, getCommentStats, replyComment, editReply, deleteReply } from '@/api/modules/comment'

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterRating = ref('')
const loading = ref(true)
const stats = reactive<any>({ avgRating: 0, totalComments: 0, monthNewComments: 0, pendingReplyCount: 0 })

const replyDialogVisible = ref(false)
const replyContent = ref('')
const currentComment = ref<any>(null)
const submitting = ref(false)

async function fetchList() {
  loading.value = true
  try {
    const res = await getCommentList({
      rating: filterRating.value ? Number(filterRating.value) : undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    list.value = res.data.list
    total.value = res.data.pagination.total
  } finally { loading.value = false }
}

async function fetchStats() {
  try {
    const res = await getCommentStats()
    Object.assign(stats, res.data)
  } catch {}
}

function openReplyDialog(comment: any) {
  currentComment.value = comment
  replyContent.value = comment.merchantReply || ''
  replyDialogVisible.value = true
}

async function handleReply() {
  if (!replyContent.value.trim()) { ElMessage.warning('请输入回复内容'); return }
  submitting.value = true
  try {
    if (currentComment.value?.merchantReply) {
      await editReply(currentComment.value.id, replyContent.value)
    } else {
      await replyComment(currentComment.value.id, replyContent.value)
    }
    ElMessage.success('回复成功')
    replyDialogVisible.value = false
    fetchList()
  } finally { submitting.value = false }
}

function formatDate(d: string) { return new Date(d).toLocaleString('zh-CN') }

onMounted(() => { fetchList(); fetchStats() })
</script>

<style scoped>
.stats-summary { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px }
.comment-item { padding:16px 0; border-bottom:1px solid #f0f0f0 }
.comment-item:last-child { border-bottom:none }
.comment-header { display:flex; justify-content:space-between; margin-bottom:10px }
.user-info { display:flex; gap:12px; align-items:center }
.nickname { font-size:14px; font-weight:500; color:#333; margin-bottom:4px }
.comment-content { color:#444; line-height:1.6; margin-bottom:10px }
.comment-images { margin-bottom:10px }
.reply-section { background:#f9f9f9; border-radius:6px; padding:10px 12px; margin-bottom:8px }
.merchant-reply { color:#666; font-size:13px; line-height:1.5 }
.reply-label { color:#667eea; font-weight:500; margin-right:6px }
.reply-time { color:#999; font-size:12px; margin-left:10px }
.no-reply { }
.comment-actions { text-align:right }
</style>