<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <el-button text @click="$router.back()">← 返回</el-button>
        <span style="margin-left:8px;font-weight:600">评论详情</span>
      </template>

      <div v-if="loadingDetail" v-loading="loadingDetail" style="min-height:200px"></div>
      <div v-else-if="comment.id">
        <!-- 评论基本信息 -->
        <el-descriptions title="评论信息" :column="2" border style="margin-bottom:24px">
          <el-descriptions-item label="用户昵称">{{ comment.userNickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="景点名称">{{ comment.poiName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="评分">
            <el-rate v-model="comment.rating" disabled />
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getAuditStatusType(comment.auditStatus)">{{ getAuditStatusText(comment.auditStatus) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="评论时间" :span="2">{{ formatDate(comment.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="评论内容" :span="2">{{ comment.content }}</el-descriptions-item>
        </el-descriptions>

        <!-- 评论图片 -->
        <div v-if="comment.images?.length" class="section">
          <h4>评论图片</h4>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <el-image
              v-for="(img, i) in comment.images"
              :key="i"
              :src="img"
              style="width:100px;height:100px;border-radius:6px;object-fit:cover"
              :preview-src-list="comment.images"
            />
          </div>
        </div>

        <!-- 商家回复 -->
        <div v-if="comment.merchantReply" class="section">
          <h4>商家回复</h4>
          <div class="reply-box">
            <p>{{ comment.merchantReply }}</p>
            <span class="reply-time" v-if="comment.replyTime">{{ formatDate(comment.replyTime) }}</span>
          </div>
        </div>

        <!-- 举报列表 -->
        <div class="section">
          <h4>举报列表 <el-tag type="danger" size="small">{{ reports.length }}</el-tag></h4>
          <el-table :data="reports" stripe size="small" v-loading="reportsLoading">
            <el-table-column prop="reporterNickname" label="举报人" width="100" />
            <el-table-column prop="reason" label="举报原因" min-width="120" show-overflow-tooltip />
            <el-table-column prop="evidence" label="证据" min-width="150" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === 1 ? 'success' : 'warning'">
                  {{ row.status === 1 ? '已处理' : '待处理' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="举报时间" width="160">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 审核操作 -->
        <div class="action-bar">
          <el-button type="success" :loading="auditLoading" @click="handleAudit('approve')" v-if="comment.auditStatus === 1">通过审核</el-button>
          <el-button type="danger" :loading="auditLoading" @click="handleAudit('reject')" v-if="comment.auditStatus === 1">拒绝审核</el-button>
          <el-input v-model="auditRemark" placeholder="审核备注（选填）" style="width:200px" v-if="comment.auditStatus === 1" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCommentDetail, auditComment } from '@/api/modules/government'
import { formatDate } from '@/utils/format'

const route = useRoute()
const loadingDetail = ref(false)
const reportsLoading = ref(false)
const auditLoading = ref(false)
const comment = ref<any>({})
const reports = ref<any[]>([])
const auditRemark = ref('')

function getAuditStatusType(status: number) {
  const types: Record<number, string> = { 1: 'warning', 2: 'success', 3: 'danger' }
  return types[status] || 'info'
}

function getAuditStatusText(status: number) {
  const texts: Record<number, string> = { 1: '待审核', 2: '已通过', 3: '已拒绝' }
  return texts[status] || '未知'
}

async function fetchDetail() {
  const id = Number(route.params.id)
  loadingDetail.value = true
  try {
    const res = await getCommentDetail(id)
    comment.value = res.data
    reports.value = res.data.reports || []
  } finally {
    loadingDetail.value = false
  }
}

async function handleAudit(action: string) {
  auditLoading.value = true
  try {
    const id = Number(route.params.id)
    await auditComment(id, { action, remark: auditRemark.value })
    ElMessage.success(action === 'approve' ? '已通过' : '已拒绝')
    fetchDetail()
  } finally {
    auditLoading.value = false
  }
}

onMounted(() => fetchDetail())
</script>

<style scoped>
.section { margin-top: 20px; }
.section h4 { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.reply-box { background: #f9f9f9; border-radius: 6px; padding: 12px 16px; }
.reply-box p { margin: 0; color: #444; line-height: 1.6; }
.reply-time { color: #999; font-size: 12px; margin-top: 8px; display: block; }
.action-bar { margin-top: 20px; display: flex; gap: 10px; align-items: center; }
</style>
