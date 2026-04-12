<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="header">
          <div>
            <span style="font-weight:600">AI 经营分析报告</span>
            <span style="color:#999;font-size:12px;margin-left:12px">基于近30天数据自动生成</span>
          </div>
          <el-button type="primary" :loading="generating" @click="generateReport">
            重新生成
          </el-button>
        </div>
      </template>

      <div v-if="generating" v-loading="generating" style="min-height:200px;display:flex;align-items:center;justify-content:center">
        <div style="text-align:center">
          <el-icon class="is-loading" style="font-size:32px;color:#667eea"><MagicStick /></el-icon>
          <div style="color:#999;margin-top:12px">AI 正在分析数据，请稍候...</div>
        </div>
      </div>

      <div v-else-if="reportContent" class="report-content">
        <div class="report-meta">
          <el-tag type="success">报告已生成</el-tag>
          <span style="color:#999;font-size:12px;margin-left:12px">
            生成时间：{{ formatDate(reportGeneratedAt) }}
          </span>
        </div>
        <div class="report-text">{{ reportContent }}</div>
      </div>

      <div v-else class="empty-report">
        <el-empty description="暂无报告，点击上方按钮生成">
          <el-button type="primary" @click="generateReport">生成报告</el-button>
        </el-empty>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { generateAiReport } from '@/api/modules/stats'
import { MagicStick } from '@element-plus/icons-vue'

const generating = ref(false)
const reportContent = ref('')
const reportGeneratedAt = ref('')

async function generateReport() {
  generating.value = true
  try {
    const res = await generateAiReport()
    reportContent.value = res.data.reportContent
    reportGeneratedAt.value = res.data.generatedAt
    ElMessage.success('报告已生成')
  } catch {}
  generating.value = false
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN')
}
</script>

<style scoped>
.header { display:flex; justify-content:space-between; align-items:center }
.report-meta { margin-bottom:16px }
.report-text {
  background: #f9f9f9;
  padding: 24px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 2;
  color: #333;
  white-space: pre-wrap;
  border: 1px solid #f0f0f0;
}
.empty-report { min-height: 300px; display:flex; align-items:center; justify-content:center }
</style>