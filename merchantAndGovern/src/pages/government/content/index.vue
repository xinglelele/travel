<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">内容管理</span>
          <div class="filters">
            <el-select v-model="filter.contentType" placeholder="内容类型" clearable style="width:120px" @change="fetchList">
              <el-option label="全部" :value="undefined" />
              <el-option label="攻略" value="guide" />
              <el-option label="资讯" value="news" />
              <el-option label="活动" value="activity" />
            </el-select>
            <el-select v-model="filter.status" placeholder="状态" clearable style="width:100px" @change="fetchList">
              <el-option label="全部" :value="undefined" />
              <el-option label="草稿" :value="0" />
              <el-option label="已发布" :value="1" />
              <el-option label="已下架" :value="2" />
            </el-select>
            <el-input v-model="filter.keyword" placeholder="搜索标题" clearable style="width:160px" @clear="fetchList" @keyup.enter="fetchList">
              <template #append>
                <el-button @click="fetchList">搜索</el-button>
              </template>
            </el-input>
            <el-button type="primary" @click="$router.push('/gov/content/create')">新建内容</el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="contentType" label="类型" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.contentType === 'guide'" size="small">攻略</el-tag>
            <el-tag v-else-if="row.contentType === 'news'" size="small">资讯</el-tag>
            <el-tag v-else-if="row.contentType === 'activity'" size="small">活动</el-tag>
            <el-tag v-else size="small">{{ row.contentType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="90" show-overflow-tooltip />
        <el-table-column prop="govName" label="发布方" width="120" />
        <el-table-column prop="viewCount" label="浏览" width="70" />
        <el-table-column prop="likeCount" label="点赞" width="70" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="info" size="small">草稿</el-tag>
            <el-tag v-else-if="row.status === 1" type="success" size="small">已发布</el-tag>
            <el-tag v-else type="warning" size="small">已下架</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishedAt" label="发布时间" width="160">
          <template #default="{ row }">{{ formatDate(row.publishedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 0" type="success" size="small" link @click="handlePublish(row)">发布</el-button>
            <el-button v-else-if="row.status === 1" type="warning" size="small" link @click="handleUnpublish(row)">下架</el-button>
            <el-button type="primary" size="small" link @click="$router.push(`/gov/content/${row.id}/edit`)">编辑</el-button>
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
import { getContentList, publishContent, unpublishContent, deleteContent } from '@/api/modules/government'
import { formatDate } from '@/utils/format'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filter = ref({ contentType: undefined as string | undefined, status: undefined as number | undefined, keyword: '' })

async function fetchList() {
  loading.value = true
  try {
    const res = await getContentList({
      contentType: filter.value.contentType,
      status: filter.value.status,
      keyword: filter.value.keyword || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    list.value = res.data.list
    total.value = res.data.pagination.total
  } finally {
    loading.value = false
  }
}

async function handlePublish(row: any) {
  await ElMessageBox.confirm(`确定发布「${row.title}」？`, '发布确认')
  await publishContent(row.id)
  ElMessage.success('已发布')
  fetchList()
}

async function handleUnpublish(row: any) {
  await ElMessageBox.confirm(`确定下架「${row.title}」？`, '下架确认')
  await unpublishContent(row.id)
  ElMessage.success('已下架')
  fetchList()
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除「${row.title}」？此操作不可恢复`, '删除确认')
  await deleteContent(row.id)
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
