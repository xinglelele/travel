<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">POI 审核队列</span>
          <div class="filters">
            <el-select v-model="filter.status" placeholder="审核状态" clearable style="width:120px" @change="fetchList">
              <el-option label="待审核" :value="0" />
              <el-option label="已通过" :value="1" />
              <el-option label="已拒绝" :value="2" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="poiName" label="景点名称" min-width="160" />
        <el-table-column prop="poiDistrict" label="区域" width="100" />
        <el-table-column prop="submitterType" label="提交方" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.submitterType === 'merchant' ? 'warning' : 'danger'">
              {{ row.submitterType === 'merchant' ? '商户' : '政府' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitterName" label="提交人" width="100" />
        <el-table-column prop="submitRemark" label="提交说明" min-width="120" show-overflow-tooltip />
        <el-table-column prop="priority" label="优先级" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.priority > 0" type="danger" size="small">高</el-tag>
            <span v-else class="text-muted">普通</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="viewDetail(row.poiId)">审核</el-button>
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
import { useRouter } from 'vue-router'
import { getPoiAuditList } from '@/api/modules/government'
import { formatDate } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filter = ref({ status: 0 })

async function fetchList() {
  loading.value = true
  try {
    const res = await getPoiAuditList({
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

function viewDetail(poiId: number) {
  router.push(`/gov/poi/audit/${poiId}`)
}

onMounted(() => fetchList())
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title { font-size: 15px; font-weight: 600; }
.filters { display: flex; gap: 10px; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
.text-muted { color: #999; font-size: 12px; }
</style>
