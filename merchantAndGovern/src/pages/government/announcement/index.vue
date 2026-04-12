<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">系统公告</span>
          <el-button type="primary" @click="$router.push('/gov/announcement/create')">新建公告</el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'notice'" size="small">通知</el-tag>
            <el-tag v-else-if="row.type === 'info'" size="small">资讯</el-tag>
            <el-tag v-else-if="row.type === 'warning'" size="small">警告</el-tag>
            <el-tag v-else size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetScope" label="推送范围" width="100">
          <template #default="{ row }">
            <span v-if="row.targetScope === 'all'">全部用户</span>
            <span v-else-if="row.targetScope === 'merchant'">商户</span>
            <span v-else-if="row.targetScope === 'user'">用户</span>
            <span v-else>{{ row.targetScope }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="publisherName" label="发布人" width="120" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="info" size="small">草稿</el-tag>
            <el-tag v-else-if="row.status === 1" type="success" size="small">已发布</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishedAt" label="发布时间" width="160">
          <template #default="{ row }">{{ formatDate(row.publishedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 1" type="warning" size="small" link @click="handleRecall(row)">撤回</el-button>
            <el-button type="primary" size="small" link @click="$router.push(`/gov/announcement/${row.id}/edit`)">编辑</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAnnouncementList, recallAnnouncement, deleteAnnouncement } from '@/api/modules/government'
import { formatDate } from '@/utils/format'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

async function fetchList() {
  loading.value = true
  try {
    const res = await getAnnouncementList({ page: page.value, pageSize: pageSize.value })
    list.value = res.data.list
    total.value = res.data.pagination.total
  } finally {
    loading.value = false
  }
}

async function handleRecall(row: any) {
  await ElMessageBox.confirm(`确定撤回「${row.title}」？`, '撤回确认')
  await recallAnnouncement(row.id)
  ElMessage.success('已撤回')
  fetchList()
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除「${row.title}」？`, '删除确认')
  await deleteAnnouncement(row.id)
  ElMessage.success('已删除')
  fetchList()
}

onMounted(() => fetchList())
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
.title { font-size: 15px; font-weight: 600; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
