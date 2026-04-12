<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">评论审核</span>
          <div class="filters">
            <el-radio-group v-model="filter.auditStatus" @change="fetchList">
              <el-radio-button value="">全部</el-radio-button>
              <el-radio-button value="1">待审核</el-radio-button>
              <el-radio-button value="2">已通过</el-radio-button>
              <el-radio-button value="3">已拒绝</el-radio-button>
            </el-radio-group>
            <el-select v-model="filter.rating" placeholder="评分筛选" clearable style="width:100px" @change="fetchList">
              <el-option v-for="n in 5" :key="n" :label="`${n}星`" :value="n" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="userNickname" label="用户" width="100" />
        <el-table-column prop="poiName" label="景点" min-width="120" />
        <el-table-column prop="rating" label="评分" width="80">
          <template #default="{ row }">
            <el-rate v-model="row.rating" disabled size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="content" label="评论内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="isReported" label="被举报" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isReported" type="danger" size="small">是</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="reportCount" label="举报数" width="80">
          <template #default="{ row }">
            <span v-if="row.reportCount > 0" style="color:#f56c6c">{{ row.reportCount }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="auditStatus" label="状态" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="getAuditStatusType(row.auditStatus)">
              {{ getAuditStatusText(row.auditStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="$router.push(`/gov/comment/audit/${row.id}`)">查看</el-button>
            <el-button type="success" size="small" link @click="handleAudit(row, 'approve')" v-if="row.auditStatus === 1">通过</el-button>
            <el-button type="danger" size="small" link @click="handleAudit(row, 'reject')" v-if="row.auditStatus === 1">拒绝</el-button>
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

    <!-- 审核弹窗 -->
    <el-dialog v-model="auditDialogVisible" title="审核评论" width="400px" destroy-on-close>
      <el-form :model="auditForm" label-width="80px">
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditForm.action">
            <el-radio value="approve">通过</el-radio>
            <el-radio value="reject">违规</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="auditForm.remark" type="textarea" :rows="3" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="auditLoading" @click="submitAudit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getCommentAuditList, auditComment } from '@/api/modules/government'
import { formatDate } from '@/utils/format'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filter = ref({ auditStatus: 1 as any, rating: '' as any })

const auditDialogVisible = ref(false)
const auditLoading = ref(false)
const auditForm = reactive({ action: 'approve', remark: '' })
const currentComment = ref<any>(null)

function getAuditStatusType(status: number) {
  const types: Record<number, string> = { 1: 'warning', 2: 'success', 3: 'danger' }
  return types[status] || 'info'
}

function getAuditStatusText(status: number) {
  const texts: Record<number, string> = { 1: '待审核', 2: '已通过', 3: '已拒绝' }
  return texts[status] || '未知'
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getCommentAuditList({
      auditStatus: filter.value.auditStatus === '' ? undefined : Number(filter.value.auditStatus),
      rating: filter.value.rating || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    list.value = res.data.list
    total.value = res.data.pagination.total
  } finally {
    loading.value = false
  }
}

function handleAudit(row: any, action: string) {
  currentComment.value = row
  auditForm.action = action
  auditForm.remark = ''
  auditDialogVisible.value = true
}

async function submitAudit() {
  if (!currentComment.value) return
  auditLoading.value = true
  try {
    await auditComment(currentComment.value.id, { action: auditForm.action, remark: auditForm.remark })
    ElMessage.success(auditForm.action === 'approve' ? '已通过' : '已拒绝')
    auditDialogVisible.value = false
    fetchList()
  } finally {
    auditLoading.value = false
  }
}

onMounted(() => fetchList())
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
.title { font-size: 15px; font-weight: 600; }
.filters { display: flex; gap: 10px; align-items: center; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
