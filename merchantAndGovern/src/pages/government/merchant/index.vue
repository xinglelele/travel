<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">商户管理</span>
          <div class="filters">
            <el-input v-model="filter.keyword" placeholder="搜索商户名称" clearable style="width:160px" @change="fetchList" />
            <el-select v-model="filter.status" placeholder="状态" clearable style="width:120px" @change="fetchList">
              <el-option label="待审核" :value="0" />
              <el-option label="已通过" :value="1" />
              <el-option label="已拒绝" :value="2" />
              <el-option label="已封禁" :value="3" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="merchantName" label="商户名称" min-width="160" />
        <el-table-column prop="tel" label="联系电话" width="130" />
        <el-table-column prop="contactPerson" label="联系人" width="100" />
        <el-table-column prop="merchantCategory" label="商户类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.merchantCategory || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="$router.push(`/gov/merchant/${row.id}`)">详情</el-button>
            <el-button type="success" size="small" link @click="handleAudit(row, 'approve')" v-if="row.status === 0">通过</el-button>
            <el-button type="warning" size="small" link @click="handleAudit(row, 'reject')" v-if="row.status === 0">拒绝</el-button>
            <el-button type="danger" size="small" link @click="handleBan(row)" v-if="row.status === 1">封禁</el-button>
            <el-button type="info" size="small" link @click="handleUnban(row)" v-if="row.status === 3">解封</el-button>
            <el-button type="default" size="small" link @click="handleResetPassword(row)">重置密码</el-button>
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
    <el-dialog v-model="auditDialogVisible" title="审核商户" width="400px" destroy-on-close>
      <el-form :model="auditForm" label-width="80px">
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditForm.action">
            <el-radio value="approve">通过</el-radio>
            <el-radio value="reject">拒绝</el-radio>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMerchantList, auditMerchant, banMerchant, unbanMerchant, resetMerchantPassword } from '@/api/modules/government'
import { formatDate } from '@/utils/format'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filter = ref({ keyword: '', status: '' as any })

const auditDialogVisible = ref(false)
const auditLoading = ref(false)
const auditForm = reactive({ action: 'approve', remark: '' })
const currentMerchant = ref<any>(null)

function getStatusType(status: number) {
  const types = ['', 'success', 'danger', 'warning']
  return types[status] || 'info'
}

function getStatusText(status: number) {
  const texts = ['', '已通过', '已拒绝', '已封禁', '']
  return texts[status] || '待审核'
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getMerchantList({
      keyword: filter.value.keyword || undefined,
      status: filter.value.status || undefined,
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
  currentMerchant.value = row
  auditForm.action = action
  auditForm.remark = ''
  auditDialogVisible.value = true
}

async function submitAudit() {
  if (!currentMerchant.value) return
  auditLoading.value = true
  try {
    await auditMerchant(currentMerchant.value.id, { action: auditForm.action, remark: auditForm.remark })
    ElMessage.success(auditForm.action === 'approve' ? '已通过审核' : '已拒绝')
    auditDialogVisible.value = false
    fetchList()
  } finally {
    auditLoading.value = false
  }
}

async function handleBan(row: any) {
  await ElMessageBox.confirm(`确定封禁「${row.merchantName}」吗？`, '确认封禁')
  await banMerchant(row.id, { reason: '政府端封禁' })
  ElMessage.success('已封禁')
  fetchList()
}

async function handleUnban(row: any) {
  await ElMessageBox.confirm(`确定解封「${row.merchantName}」吗？`, '确认解封')
  await unbanMerchant(row.id)
  ElMessage.success('已解封')
  fetchList()
}

async function handleResetPassword(row: any) {
  await ElMessageBox.confirm(`确定重置「${row.merchantName}」的密码吗？`, '确认重置')
  await resetMerchantPassword(row.id)
  ElMessage.success('密码已重置为默认密码')
}

onMounted(() => fetchList())
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
.title { font-size: 15px; font-weight: 600; }
.filters { display: flex; gap: 10px; align-items: center; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
