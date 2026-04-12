<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">举报处理</span>
          <div class="filters">
            <el-select v-model="filter.status" placeholder="处理状态" clearable style="width:120px" @change="fetchList">
              <el-option label="待处理" :value="0" />
              <el-option label="已处理" :value="1" />
            </el-select>
            <el-select v-model="filter.targetType" placeholder="举报类型" clearable style="width:120px" @change="fetchList">
              <el-option label="评论" value="comment" />
              <el-option label="内容" value="content" />
              <el-option label="景点" value="poi" />
              <el-option label="商户" value="merchant" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="reporterNickname" label="举报人" width="100" />
        <el-table-column prop="targetType" label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ getTargetTypeText(row.targetType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetPreview" label="被举报内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="reason" label="举报原因" min-width="120" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 0 ? 'warning' : 'success'">
              {{ row.status === 0 ? '待处理' : '已处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="举报时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="$router.push(`/gov/report/${row.id}`)">查看</el-button>
            <el-button type="success" size="small" link @click="handleProcess(row, 'valid')" v-if="row.status === 0">处理</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @change="fetchList"
        />
      </div>
    </el-card>

    <!-- 处理弹窗 -->
    <el-dialog v-model="processDialogVisible" title="处理举报" width="400px" destroy-on-close>
      <el-form :model="processForm" label-width="80px">
        <el-form-item label="处理结果">
          <el-radio-group v-model="processForm.action">
            <el-radio value="valid">有效举报</el-radio>
            <el-radio value="invalid">无效举报</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处理说明">
          <el-input v-model="processForm.handleResult" type="textarea" :rows="3" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="processLoading" @click="submitProcess">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getReportList, handleReport } from '@/api/modules/government'
import { formatDate } from '@/utils/format'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filter = ref({ status: 0 as any, targetType: '' as any })

const processDialogVisible = ref(false)
const processLoading = ref(false)
const processForm = reactive({ action: 'valid', handleResult: '' })
const currentReport = ref<any>(null)

function getTargetTypeText(type: string) {
  const map: Record<string, string> = { comment: '评论', content: '内容', poi: '景点', merchant: '商户' }
  return map[type] || type
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getReportList({
      status: filter.value.status || undefined,
      targetType: filter.value.targetType || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    list.value = res.data.list
    total.value = res.data.pagination.total
  } finally {
    loading.value = false
  }
}

function handleProcess(row: any, action: string) {
  currentReport.value = row
  processForm.action = action
  processForm.handleResult = ''
  processDialogVisible.value = true
}

async function submitProcess() {
  if (!currentReport.value) return
  processLoading.value = true
  try {
    await handleReport(currentReport.value.id, {
      action: processForm.action,
      handleResult: processForm.handleResult
    })
    ElMessage.success('处理完成')
    processDialogVisible.value = false
    fetchList()
  } finally {
    processLoading.value = false
  }
}

onMounted(() => fetchList())
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
.title { font-size: 15px; font-weight: 600; }
.filters { display: flex; gap: 10px; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
