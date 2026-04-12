<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header><span style="font-weight:600">审核历史</span></template>
      <el-table :data="history" v-loading="loading">
        <el-table-column prop="action" label="操作" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.action==='create'" type="success" size="small">新建</el-tag>
            <el-tag v-else-if="row.action==='update'" type="warning" size="small">更新</el-tag>
            <el-tag v-else type="info" size="small">{{ row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="statusBefore" label="变更前" width="100">
          <template #default="{ row }">{{ statusName(row.statusBefore) }}</template>
        </el-table-column>
        <el-table-column prop="statusAfter" label="变更后" width="100">
          <template #default="{ row }">{{ statusName(row.statusAfter) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getPoiReviewHistory } from '@/api/modules/poi'
const history = ref<any[]>([])
const loading = ref(true)
onMounted(async () => {
  try { history.value = await getPoiReviewHistory() } finally { loading.value = false }
})
function statusName(s: number) {
  return [-1,'待审核','已上线','已下架'][s + 1] ?? `状态${s}`
}
function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN')
}
</script>