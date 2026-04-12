<template>
  <div class="page-container">
    <el-page-header @back="$router.back()" title="返回审核队列" content="POI 审核详情" />

    <el-card shadow="never" style="margin-top:16px" v-loading="loading">
      <!-- 基本信息 -->
      <div class="section">
        <h3 class="section-title">景点信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="景点名称">{{ detail.poiName?.zh || detail.poiName }}</el-descriptions-item>
          <el-descriptions-item label="区域">{{ detail.district?.name || detail.district || '—' }}</el-descriptions-item>
          <el-descriptions-item label="地址">{{ detail.address?.zh }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ detail.tel || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ detail.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="经纬度">{{ detail.longitude }}, {{ detail.latitude }}</el-descriptions-item>
          <el-descriptions-item label="是否免费">
            <el-tag size="small" :type="detail.isFree === 1 ? 'success' : 'warning'">
              {{ detail.isFree === 1 ? '免费' : '收费' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="是否需要票务">{{ detail.needTickets === 1 ? '是' : '否' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 描述 -->
      <div class="section" v-if="detail.description">
        <h3 class="section-title">景点描述</h3>
        <div class="description-text">{{ typeof detail.description === 'object' ? JSON.stringify(detail.description) : detail.description }}</div>
      </div>

      <!-- 标签 -->
      <div class="section" v-if="detail.tags?.length">
        <h3 class="section-title">标签</h3>
        <el-tag v-for="tag in detail.tags" :key="tag.id" size="small" style="margin-right:6px">{{ tag.tagName }}</el-tag>
      </div>

      <!-- 开放时间 -->
      <div class="section" v-if="detail.openingTimes?.length">
        <h3 class="section-title">开放时间</h3>
        <el-table :data="detail.openingTimes" size="small">
          <el-table-column prop="type" label="类型" width="80">
            <template #default="{ row }">{{ row.type === 'weekday' ? '工作日' : row.type === 'weekend' ? '周末' : '节假日' }}</template>
          </el-table-column>
          <el-table-column prop="value" label="适用时段" />
          <el-table-column prop="time" label="时间" />
        </el-table>
      </div>

      <!-- 关联商户 -->
      <div class="section" v-if="detail.merchant">
        <h3 class="section-title">关联商户</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="商户名称">{{ detail.merchant.merchantName }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detail.merchant.tel }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ detail.merchant.contactPerson || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 审核操作（仅待审核时显示） -->
      <div class="section" v-if="detail.auditQueue?.status === 0">
        <h3 class="section-title">审核操作</h3>
        <el-input v-model="auditRemark" type="textarea" :rows="3" placeholder="请填写审核备注（拒绝时必填）" style="margin-bottom:12px" />
        <el-button type="success" @click="handleAudit('approve')">通过</el-button>
        <el-button type="danger" @click="handleAudit('reject')">拒绝</el-button>
      </div>

      <!-- 审核历史 -->
      <div class="section" v-if="detail.reviewHistory?.length">
        <h3 class="section-title">审核历史</h3>
        <el-timeline>
          <el-timeline-item v-for="r in detail.reviewHistory" :key="r.id" :timestamp="formatDate(r.createdAt)" placement="top">
            <p><strong>{{ r.action === 'approve' ? '通过' : r.action === 'reject' ? '拒绝' : r.action }}</strong>
            <span v-if="r.remark"> - {{ r.remark }}</span></p>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getPoiAuditDetail, auditPoi } from '@/api/modules/government'
import { formatDate } from '@/utils/format'

const route = useRoute()
const loading = ref(false)
const detail = ref<any>({})
const auditRemark = ref('')

async function fetchDetail() {
  loading.value = true
  try {
    const res = await getPoiAuditDetail(Number(route.params.id))
    detail.value = res.data
  } finally {
    loading.value = false
  }
}

async function handleAudit(action: string) {
  if (action === 'reject' && !auditRemark.value) {
    ElMessage.warning('拒绝时必须填写备注')
    return
  }
  try {
    await auditPoi(Number(route.params.id), { action, remark: auditRemark.value })
    ElMessage.success(action === 'approve' ? '已通过' : '已拒绝')
    fetchDetail()
  } catch { /* handled */ }
}

onMounted(() => fetchDetail())
</script>

<style scoped>
.section { margin-bottom: 24px; }
.section-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; border-left: 3px solid #e74c3c; padding-left: 8px; }
.description-text { color: #666; line-height: 1.6; font-size: 13px; }
</style>