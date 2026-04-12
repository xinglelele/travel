<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="poi-header">
          <div>
            <h3 class="poi-name">{{ poi.poiName?.zh || '未命名景点' }}</h3>
            <el-tag v-if="poi.status === 0" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="poi.status === 1" type="success" size="small">已上线</el-tag>
            <el-tag v-else type="info" size="small">已下架</el-tag>
          </div>
          <div class="poi-actions">
            <el-button @click="$router.push('/merchant/poi/history')">审核历史</el-button>
            <el-button type="primary" :disabled="poi.status === 0" @click="$router.push('/merchant/poi/edit')">
              {{ poi.id ? '编辑景点' : '填写景点信息' }}
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" v-loading="loading" style="min-height: 200px"></div>
      <div v-else-if="!poi.id" class="empty-poi">
        <el-empty description="您尚未创建景点信息">
          <el-button type="primary" @click="$router.push('/merchant/poi/edit')">立即填写</el-button>
        </el-empty>
      </div>
      <div v-else class="poi-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="景点名称">{{ poi.poiName?.zh }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ poi.tel || '—' }}</el-descriptions-item>
          <el-descriptions-item label="地址">{{ poi.address?.zh || '—' }}</el-descriptions-item>
          <el-descriptions-item label="行政区">{{ poi.district?.name || '—' }}</el-descriptions-item>
          <el-descriptions-item label="是否免费">{{ poi.isFree ? '免费' : '收费' }}</el-descriptions-item>
          <el-descriptions-item label="需要门票">{{ poi.needTickets ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="需要预约">{{ poi.needBook ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <span v-if="poi.auditStatus === 0" style="color:#e6a23c">待审核</span>
            <span v-else-if="poi.auditStatus === 1" style="color:#67c23a">已通过</span>
            <span v-else-if="poi.auditStatus === 2" style="color:#f56c6c">已拒绝 ({{ poi.auditRemark }})</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 统计卡片 -->
        <div class="poi-stats-row">
          <div class="poi-stat-item">
            <div class="stat-icon" style="background:#667eea20"><span style="color:#667eea">📍</span></div>
            <div>
              <div class="stat-val">{{ poi.checkCount ?? 0 }}</div>
              <div class="stat-label">累计打卡</div>
            </div>
          </div>
          <div class="poi-stat-item">
            <div class="stat-icon" style="background:#f56c6c20"><span style="color:#f56c6c">⭐</span></div>
            <div>
              <div class="stat-val">{{ poi.avgRating ?? 0 }}</div>
              <div class="stat-label">平均评分</div>
            </div>
          </div>
          <div class="poi-stat-item">
            <div class="stat-icon" style="background:#67c23a20"><span style="color:#67c23a">💬</span></div>
            <div>
              <div class="stat-val">{{ poi.commentCount ?? 0 }}</div>
              <div class="stat-label">累计评论</div>
            </div>
          </div>
        </div>

        <!-- 开放时间 -->
        <div v-if="poi.openingTimes?.length" class="section">
          <h4>开放时间</h4>
          <el-tag v-for="ot in poi.openingTimes" :key="ot.id" style="margin-right:8px;margin-bottom:8px">
            {{ ot.type === 'week' ? `周${ot.value}` : ot.value }}: {{ ot.time?.zh }}
          </el-tag>
        </div>

        <!-- 标签 -->
        <div v-if="poi.tags?.length" class="section">
          <h4>标签</h4>
          <el-tag v-for="t in poi.tags" :key="t.id" style="margin-right:8px">{{ t.tagName?.zh }}</el-tag>
        </div>

        <!-- 照片 -->
        <div v-if="poi.photos?.length" class="section">
          <h4>景点照片</h4>
          <el-image
            v-for="(photo, i) in poi.photos"
            :key="i"
            :src="photo"
            style="width:160px;height:120px;margin-right:12px;border-radius:8px;object-fit:cover"
            :preview-src-list="poi.photos"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getMerchantPoi } from '@/api/modules/poi'

const loading = ref(true)
const poi = reactive<any>({})

onMounted(async () => {
  try {
    const res = await getMerchantPoi()
    Object.assign(poi, res.data)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.poi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.poi-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}
.poi-actions { display: flex; gap: 10px; }
.poi-stats-row {
  display: flex;
  gap: 24px;
  padding: 20px 0;
}
.poi-stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.stat-val {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
}
.stat-label {
  font-size: 12px;
  color: #999;
}
.section {
  padding-top: 20px;
}
.section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}
</style>