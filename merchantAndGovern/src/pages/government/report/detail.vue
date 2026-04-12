<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <el-button text @click="$router.back()">← 返回</el-button>
        <span style="margin-left:8px;font-weight:600">举报详情</span>
      </template>

      <div v-if="loadingDetail" v-loading="loadingDetail" style="min-height:200px"></div>
      <div v-else-if="report.id">
        <!-- 举报基本信息 -->
        <el-descriptions title="举报信息" :column="2" border style="margin-bottom:24px">
          <el-descriptions-item label="举报人">{{ report.reporterNickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="举报类型">
            <el-tag size="small">{{ getTargetTypeText(report.targetType) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="举报原因" :span="2">{{ report.reason || '-' }}</el-descriptions-item>
          <el-descriptions-item label="举报时间" :span="2">{{ formatDate(report.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="report.status === 0 ? 'warning' : 'success'">
              {{ report.status === 0 ? '待处理' : '已处理' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="处理时间" v-if="report.handleTime">
            {{ formatDate(report.handleTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="处理结果" :span="2" v-if="report.handleResult">
            {{ report.handleResult }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 被举报内容详情 -->
        <div class="section">
          <h4>被举报内容</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="内容类型">{{ getTargetTypeText(report.targetType) }}</el-descriptions-item>
            <el-descriptions-item label="内容ID">{{ report.targetId }}</el-descriptions-item>
            <el-descriptions-item label="内容预览" :span="2">{{ report.targetPreview || '-' }}</el-descriptions-item>
          </el-descriptions>

          <!-- 如果有详细内容 -->
          <div v-if="targetDetail" class="target-detail-box">
            <template v-if="report.targetType === 'comment'">
              <p><strong>评论内容：</strong>{{ targetDetail.content }}</p>
              <p><strong>用户：</strong>{{ targetDetail.userNickname }}</p>
              <p><strong>景点：</strong>{{ targetDetail.poiName }}</p>
              <p><strong>评分：</strong><el-rate v-model="targetDetail.rating" disabled /></p>
            </template>
            <template v-else-if="report.targetType === 'content'">
              <p><strong>标题：</strong>{{ targetDetail.title }}</p>
              <p><strong>内容：</strong>{{ targetDetail.content }}</p>
              <p><strong>发布者：</strong>{{ targetDetail.publisherName }}</p>
            </template>
            <template v-else>
              <pre style="white-space:pre-wrap">{{ JSON.stringify(targetDetail, null, 2) }}</pre>
            </template>
          </div>
        </div>

        <!-- 证据 -->
        <div v-if="report.evidence" class="section">
          <h4>证据</h4>
          <div class="evidence-box">
            <p>{{ report.evidence }}</p>
          </div>
        </div>

        <!-- 处理操作 -->
        <div class="action-bar" v-if="report.status === 0">
          <el-button type="success" :loading="processLoading" @click="handleProcess('valid')">有效举报</el-button>
          <el-button type="info" :loading="processLoading" @click="handleProcess('invalid')">无效举报</el-button>
          <el-input v-model="handleResult" placeholder="处理说明（选填）" style="width:200px" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getReportDetail, handleReport } from '@/api/modules/government'
import { formatDate } from '@/utils/format'

const route = useRoute()
const loadingDetail = ref(false)
const processLoading = ref(false)
const report = ref<any>({})
const targetDetail = ref<any>(null)
const handleResult = ref('')

function getTargetTypeText(type: string) {
  const map: Record<string, string> = { comment: '评论', content: '内容', poi: '景点', merchant: '商户' }
  return map[type] || type
}

async function fetchDetail() {
  const id = Number(route.params.id)
  loadingDetail.value = true
  try {
    const res = await getReportDetail(id)
    report.value = res.data
    targetDetail.value = res.data.targetDetail || null
  } finally {
    loadingDetail.value = false
  }
}

async function handleProcess(action: string) {
  processLoading.value = true
  try {
    const id = Number(route.params.id)
    await handleReport(id, { action, handleResult: handleResult.value })
    ElMessage.success('处理完成')
    fetchDetail()
  } finally {
    processLoading.value = false
  }
}

onMounted(() => fetchDetail())
</script>

<style scoped>
.section { margin-top: 20px; }
.section h4 { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; }
.target-detail-box { background: #f9f9f9; border-radius: 6px; padding: 12px 16px; margin-top: 12px; }
.target-detail-box p { margin: 0 0 8px; color: #444; line-height: 1.6; }
.evidence-box { background: #fff3f3; border-radius: 6px; padding: 12px 16px; }
.evidence-box p { margin: 0; color: #666; }
.action-bar { margin-top: 20px; display: flex; gap: 10px; align-items: center; }
</style>
