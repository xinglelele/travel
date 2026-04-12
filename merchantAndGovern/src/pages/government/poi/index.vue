<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">景点管理</span>
          <div class="filters">
            <el-input v-model="filter.keyword" placeholder="搜索景点名称" clearable style="width:160px" @change="fetchList" />
            <el-select v-model="filter.status" placeholder="状态" clearable style="width:120px" @change="fetchList">
              <el-option label="正常" :value="1" />
              <el-option label="待审" :value="0" />
              <el-option label="已下架" :value="2" />
            </el-select>
            <el-select v-model="filter.districtId" placeholder="区域" clearable style="width:130px" @change="fetchList">
              <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
            <el-button type="primary" @click="$router.push('/gov/poi/create')">创建景点</el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="poiName" label="景点名称" min-width="160" />
        <el-table-column prop="district" label="区域" width="100" />
        <el-table-column prop="tel" label="电话" width="120" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 1 ? 'success' : row.status === 0 ? 'warning' : 'info'">
              {{ ['', '正常', '已下架', ''][row.status] || '待审' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="auditStatus" label="审核" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.auditStatus === 1 ? 'success' : row.auditStatus === 2 ? 'danger' : 'warning'">
              {{ poiAuditLabel(row.auditStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="merchantName" label="运营商户" min-width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="$router.push(`/gov/poi/${row.id}/edit`)">编辑</el-button>
            <el-button type="danger" size="small" link @click="handleOffline(row)" v-if="row.status === 1">下架</el-button>
            <el-button type="info" size="small" link @click="$router.push(`/gov/poi/${row.id}/edit`)">查看</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { getPoiList, offlinePoi, getDistrictList } from '@/api/modules/government'
import { formatDate } from '@/utils/format'

/** POI 审核：0 待审，1 通过，2 拒绝（与后端 government-audit 一致） */
function poiAuditLabel(s: number | undefined) {
  const map: Record<number, string> = { 0: '待审', 1: '通过', 2: '拒绝' }
  return map[s ?? 0] ?? '待审'
}

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const districts = ref<any[]>([])
const filter = ref({ keyword: '', status: '', districtId: '' })

async function fetchList() {
  loading.value = true
  try {
    const res = await getPoiList({ ...filter.value, page: page.value, pageSize: pageSize.value })
    list.value = res.data.list
    total.value = res.data.pagination.total
  } finally {
    loading.value = false
  }
}

async function handleOffline(row: any) {
  await ElMessageBox.confirm(`确定下架「${row.poiName}」吗？`, '确认')
  await offlinePoi(row.id, { reason: '政府端强制下架' })
  ElMessage.success('已下架')
  fetchList()
}

onMounted(async () => {
  const dRes = await getDistrictList()
  districts.value = dRes.data || []
  fetchList()
})
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
.title { font-size: 15px; font-weight: 600; }
.filters { display: flex; gap: 10px; align-items: center; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>