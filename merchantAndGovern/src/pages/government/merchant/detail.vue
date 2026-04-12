<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <el-button text @click="$router.back()">← 返回</el-button>
        <span style="margin-left:8px;font-weight:600">商户详情</span>
      </template>

      <div v-if="loadingDetail" v-loading="loadingDetail" style="min-height:200px"></div>
      <div v-else-if="merchant.id">
        <!-- 基本信息 -->
        <el-descriptions title="基本信息" :column="2" border style="margin-bottom:24px">
          <el-descriptions-item label="商户名称">{{ merchant.merchantName }}</el-descriptions-item>
          <el-descriptions-item label="商户类型">{{ merchant.merchantCategory || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ merchant.contactPerson || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ merchant.tel || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ merchant.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(merchant.status)">{{ getStatusText(merchant.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDate(merchant.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="营业执照">{{ merchant.businessLicense || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 统计卡片 -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background:#667eea20"><span style="color:#667eea">📍</span></div>
            <div>
              <div class="stat-val">{{ stats.checkCount ?? 0 }}</div>
              <div class="stat-label">累计打卡</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#f56c6c20"><span style="color:#f56c6c">⭐</span></div>
            <div>
              <div class="stat-val">{{ stats.avgRating ?? 0 }}</div>
              <div class="stat-label">平均评分</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#67c23a20"><span style="color:#67c23a">💬</span></div>
            <div>
              <div class="stat-val">{{ stats.commentCount ?? 0 }}</div>
              <div class="stat-label">累计评论</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#e6a23c20"><span style="color:#e6a23c">🎫</span></div>
            <div>
              <div class="stat-val">{{ stats.ticketCount ?? 0 }}</div>
              <div class="stat-label">在售票种</div>
            </div>
          </div>
        </div>

        <!-- 关联景点 -->
        <div class="section">
          <h4>关联景点</h4>
          <el-table :data="pois" stripe size="small" v-loading="poisLoading">
            <el-table-column prop="poiName" label="景点名称" min-width="160" />
            <el-table-column prop="district" label="区域" width="100" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === 1 ? 'success' : row.status === 0 ? 'warning' : 'info'">
                  {{ ['', '正常', '已下架', ''][row.status] || '待审' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 审核历史 -->
        <div class="section">
          <h4>审核历史</h4>
          <el-table :data="reviews" stripe size="small" v-loading="reviewsLoading">
            <el-table-column prop="auditStatus" label="结果" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="row.auditStatus === 1 ? 'success' : 'danger'">
                  {{ row.auditStatus === 1 ? '通过' : '拒绝' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="120" />
            <el-table-column prop="auditorName" label="审核人" width="100" />
            <el-table-column prop="createdAt" label="时间" width="160">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="reviewTotal > 0"
            v-model:current-page="reviewPage"
            v-model:page-size="reviewPageSize"
            :total="reviewTotal"
            layout="prev, pager, next"
            style="margin-top:12px"
            @current-change="fetchReviews"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button type="primary" @click="$router.push(`/gov/poi/${pois[0]?.id}/edit`)" v-if="pois.length > 0">编辑景点</el-button>
          <el-button type="danger" @click="handleBan" v-if="merchant.status === 1">封禁商户</el-button>
          <el-button type="info" @click="handleUnban" v-if="merchant.status === 3">解封商户</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMerchantDetail, getMerchantPois, getMerchantReviews, banMerchant, unbanMerchant } from '@/api/modules/government'
import { formatDate } from '@/utils/format'

const route = useRoute()
const loadingDetail = ref(false)
const merchant = ref<any>({})
const stats = reactive<any>({ checkCount: 0, avgRating: 0, commentCount: 0, ticketCount: 0 })
const pois = ref<any[]>([])
const reviews = ref<any[]>([])
const poisLoading = ref(false)
const reviewsLoading = ref(false)
const reviewPage = ref(1)
const reviewPageSize = ref(10)
const reviewTotal = ref(0)

function getStatusType(status: number) {
  const types = ['', 'success', 'danger', 'warning']
  return types[status] || 'info'
}

function getStatusText(status: number) {
  const texts = ['', '已通过', '已拒绝', '已封禁', '']
  return texts[status] || '待审核'
}

async function fetchDetail() {
  const id = Number(route.params.id)
  loadingDetail.value = true
  try {
    const res = await getMerchantDetail(id)
    merchant.value = res.data
    stats.checkCount = res.data.checkCount ?? 0
    stats.avgRating = res.data.avgRating ?? 0
    stats.commentCount = res.data.commentCount ?? 0
    stats.ticketCount = res.data.ticketCount ?? 0
  } finally {
    loadingDetail.value = false
  }
}

async function fetchPois() {
  const id = Number(route.params.id)
  poisLoading.value = true
  try {
    const res = await getMerchantPois(id)
    pois.value = res.data || []
  } finally {
    poisLoading.value = false
  }
}

async function fetchReviews() {
  const id = Number(route.params.id)
  reviewsLoading.value = true
  try {
    const res = await getMerchantReviews(id, { page: reviewPage.value, pageSize: reviewPageSize.value })
    reviews.value = res.data.list || []
    reviewTotal.value = res.data.pagination?.total || 0
  } finally {
    reviewsLoading.value = false
  }
}

async function handleBan() {
  await ElMessageBox.confirm(`确定封禁该商户吗？`, '确认封禁')
  await banMerchant(merchant.value.id, { reason: '政府端封禁' })
  ElMessage.success('已封禁')
  fetchDetail()
}

async function handleUnban() {
  await ElMessageBox.confirm(`确定解封该商户吗？`, '确认解封')
  await unbanMerchant(merchant.value.id)
  ElMessage.success('已解封')
  fetchDetail()
}

onMounted(() => {
  fetchDetail()
  fetchPois()
  fetchReviews()
})
</script>

<style scoped>
.stats-grid { display: flex; gap: 16px; margin-bottom: 24px; }
.stat-card { display: flex; align-items: center; gap: 12px; background: #f9f9f9; border-radius: 10px; padding: 16px 20px; flex: 1; }
.stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.stat-val { font-size: 22px; font-weight: 700; color: #1a1a1a; }
.stat-label { font-size: 12px; color: #999; }
.section { margin-top: 20px; }
.section h4 { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; }
.action-bar { margin-top: 20px; display: flex; gap: 10px; }
</style>
