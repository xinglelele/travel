<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">账号管理</span>
          <div class="filters">
            <el-select v-model="filter.role" placeholder="角色" clearable style="width:120px" @change="fetchList">
              <el-option label="全部" :value="undefined" />
              <el-option label="超管" :value="0" />
              <el-option label="管理员" :value="1" />
              <el-option label="审核员" :value="2" />
            </el-select>
            <el-select v-model="filter.status" placeholder="状态" clearable style="width:100px" @change="fetchList">
              <el-option label="全部" :value="undefined" />
              <el-option label="正常" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
            <el-button type="primary" @click="$router.push('/gov/admin/create')">创建管理员</el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column prop="tel" label="电话" width="130" />
        <el-table-column prop="department" label="部门" width="120" show-overflow-tooltip />
        <el-table-column prop="role" label="角色" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.role === 0" type="danger" size="small">超管</el-tag>
            <el-tag v-else-if="row.role === 1" type="warning" size="small">管理员</el-tag>
            <el-tag v-else type="info" size="small">审核员</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success" size="small">正常</el-tag>
            <el-tag v-else type="danger" size="small">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最后登录" width="160">
          <template #default="{ row }">{{ formatDate(row.lastLoginAt) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" size="small" link @click="handleResetPwd(row)">重置密码</el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row)">删除</el-button>
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

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editDialogVisible" title="编辑管理员" width="500px" destroy-on-close>
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="editForm.realName" />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="editForm.department" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" style="width:200px">
            <el-option label="超管" :value="0" />
            <el-option label="管理员" :value="1" />
            <el-option label="审核员" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" style="width:200px">
            <el-option label="正常" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleUpdate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAdminList, updateAdmin, deleteAdmin, resetAdminPassword } from '@/api/modules/government'
import { formatDate } from '@/utils/format'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filter = ref({ role: undefined as number | undefined, status: undefined as number | undefined })

const editDialogVisible = ref(false)
const editForm = ref<any>({})
const currentEditId = ref<number | null>(null)
const submitting = ref(false)

async function fetchList() {
  loading.value = true
  try {
    const res = await getAdminList({
      role: filter.value.role,
      status: filter.value.status,
      page: page.value,
      pageSize: pageSize.value
    })
    list.value = res.data.list
    total.value = res.data.pagination.total
  } finally {
    loading.value = false
  }
}

function handleEdit(row: any) {
  currentEditId.value = row.id
  editForm.value = { realName: row.realName, department: row.department, role: row.role, status: row.status }
  editDialogVisible.value = true
}

async function handleUpdate() {
  if (!currentEditId.value) return
  submitting.value = true
  try {
    await updateAdmin(currentEditId.value, editForm.value)
    ElMessage.success('更新成功')
    editDialogVisible.value = false
    fetchList()
  } finally {
    submitting.value = false
  }
}

async function handleResetPwd(row: any) {
  await ElMessageBox.confirm(`确定重置「${row.username}」的密码？`, '重置密码')
  await resetAdminPassword(row.id)
  ElMessage.success('密码已重置')
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除管理员「${row.username}」？此操作不可恢复`, '删除确认')
  await deleteAdmin(row.id)
  ElMessage.success('已删除')
  fetchList()
}

onMounted(() => fetchList())
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
.title { font-size: 15px; font-weight: 600; }
.filters { display: flex; gap: 10px; align-items: center; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
