<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="stats-row">
            <el-statistic title="票种总数" :value="stats.total" />
            <el-statistic title="在售票种" :value="stats.onSale" />
            <el-statistic title="停售票种" :value="stats.offSale" />
          </div>
          <el-button type="primary" @click="$router.push('/merchant/ticket/edit')">新增票种</el-button>
        </div>
      </template>

      <div class="filter-row">
        <el-radio-group v-model="filterStatus" @change="fetchData">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="1">在售</el-radio-button>
          <el-radio-button value="0">停售</el-radio-button>
        </el-radio-group>
      </div>

      <el-table :data="list" v-loading="loading" row-class-name="low-stock-row">
        <el-table-column prop="ticketName" label="票种名称" min-width="120">
          <template #default="{ row }">{{ row.ticketName?.zh || row.ticketName }}</template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100">
          <template #default="{ row }">
            <span :class="{ 'low-stock': row.stock <= 10 && row.stock > 0 }">{{ row.stock === 0 ? '不限量' : row.stock }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '在售' : '停售' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="$router.push(`/merchant/ticket/edit?id=${row.id}`)">编辑</el-button>
            <el-button type="danger" text size="small" @click="handleDelete(row)">{{ row.status === 1 ? '停售' : '删除' }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 0"
        layout="total, prev, pager, next"
        :total="total"
        :page.sync="page"
        :page-size="pageSize"
        @current-change="fetchData"
        style="margin-top:16px;justify-content:center"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { getTicketList, deleteTicket } from '@/api/modules/ticket'
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')
const loading = ref(true)
const stats = reactive({ total: 0, onSale: 0, offSale: 0 })

async function fetchData() {
  loading.value = true
  try {
    const res = await getTicketList({ status: filterStatus.value ? Number(filterStatus.value) : undefined, page: page.value, pageSize: pageSize.value })
    list.value = res.data.list
    total.value = res.data.pagination.total
    Object.assign(stats, res.data.stats)
  } finally { loading.value = false }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定要${row.status === 1 ? '停售' : '删除'}该票种吗？`)
  await deleteTicket(row.id)
  ElMessageBox.alert('操作成功', '提示')
  fetchData()
}

function formatDate(d: string) { return new Date(d).toLocaleString('zh-CN') }

onMounted(fetchData)
</script>

<style scoped>
.card-header { display:flex; justify-content:space-between; align-items:center }
.stats-row { display:flex; gap:32px }
.low-stock { color:#f56c6c; font-weight:600 }
:deep(.low-stock-row .el-table__cell) { background:#fff5f5 }
</style>