<template>
  <div class="page-container">
    <!-- 指标卡片行 -->
    <div class="card-grid">
      <div class="stats-card" v-for="card in statsCards" :key="card.key">
        <div class="card-label">{{ card.label }}</div>
        <div class="card-value">{{ formatStat(flattenKey(overview, card.key)) }}</div>
        <div class="card-sub" v-if="card.sub">{{ formatStat(flattenKey(overview, card.sub.key)) }}</div>
      </div>
    </div>

    <!-- 图表行 -->
    <div class="charts-row">
      <el-card class="chart-card" shadow="never">
        <template #header>
          <span class="card-title">打卡趋势</span>
          <el-radio-group v-model="checkPeriod" size="small" style="float:right" @change="fetchCheckTrend">
            <el-radio-button value="7d">近7天</el-radio-button>
            <el-radio-button value="30d">近30天</el-radio-button>
            <el-radio-button value="90d">近90天</el-radio-button>
          </el-radio-group>
        </template>
        <div ref="checkChartRef" style="height: 280px"></div>
      </el-card>
      <el-card class="chart-card" shadow="never">
        <template #header><span class="card-title">评分分布</span></template>
        <div ref="ratingChartRef" style="height: 280px"></div>
      </el-card>
    </div>

    <!-- POI 排行 + 今日动态 -->
    <div class="charts-row">
      <el-card class="chart-card" shadow="never">
        <template #header>
          <span class="card-title">POI 热榜</span>
          <el-radio-group v-model="rankType" size="small" style="float:right" @change="fetchRanking">
            <el-radio-button value="check">打卡量</el-radio-button>
            <el-radio-button value="rating">评分</el-radio-button>
          </el-radio-group>
        </template>
        <div ref="rankingChartRef" style="height: 280px"></div>
      </el-card>
      <el-card class="chart-card" shadow="never">
        <template #header><span class="card-title">今日动态</span></template>
        <div class="today-list">
          <div class="today-item">
            <el-icon class="today-icon" color="#67c23a"><User /></el-icon>
            <span>新增用户</span>
            <span class="today-value">{{ overview.todayHighlight?.newUser ?? 0 }}</span>
          </div>
          <div class="today-item">
            <el-icon class="today-icon" color="#409eff"><Location /></el-icon>
            <span>今日打卡</span>
            <span class="today-value">{{ overview.todayHighlight?.newCheck ?? 0 }}</span>
          </div>
          <div class="today-item">
            <el-icon class="today-icon" color="#e6a23c"><ChatLineSquare /></el-icon>
            <span>新增评论</span>
            <span class="today-value">{{ overview.todayHighlight?.newComment ?? 0 }}</span>
          </div>
          <div class="today-item">
            <el-icon class="today-icon" color="#f56c6c"><OfficeBuilding /></el-icon>
            <span>新商户入驻</span>
            <span class="today-value">{{ overview.todayHighlight?.newMerchant ?? 0 }}</span>
          </div>
          <div class="today-item">
            <el-icon class="today-icon" color="#909399"><DocumentChecked /></el-icon>
            <span>待审核 POI</span>
            <span class="today-value danger">{{ overview.poi?.todayAudit ?? 0 }}</span>
          </div>
          <div class="today-item">
            <el-icon class="today-icon" color="#909399"><ChatDotSquare /></el-icon>
            <span>待审核评论</span>
            <span class="today-value danger">{{ overview.comment?.pendingAudit ?? 0 }}</span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getGovStatsOverview, getGovCheckTrend, getGovRatingDistribution, getGovPoiRanking } from '@/api/modules/government'
import { User, Location, ChatLineSquare, OfficeBuilding, DocumentChecked, ChatDotSquare } from '@element-plus/icons-vue'

const checkChartRef = ref<HTMLElement>()
const ratingChartRef = ref<HTMLElement>()
const rankingChartRef = ref<HTMLElement>()

const checkPeriod = ref('30d')
const rankType = ref('check')

const overview = reactive<any>({
  poi: { total: 0, active: 0, todayAudit: 0 },
  merchant: { total: 0, active: 0 },
  user: { total: 0, newThisMonth: 0, newTrend: 0 },
  check: { today: 0, total: 0, checkTrend: 0 },
  comment: { total: 0, monthNew: 0, pendingAudit: 0, avgRating: 0 },
  todayHighlight: { newCheck: 0, newComment: 0, newMerchant: 0, newUser: 0 }
})

const statsCards = [
  { key: 'poi.active', label: '在线景点', sub: { key: 'poi.total', text: '共 -- 个' } },
  { key: 'merchant.active', label: '运营商户', sub: { key: 'merchant.total', text: '共 -- 个' } },
  { key: 'user.total', label: '注册用户', sub: { key: 'user.newThisMonth', text: '本月新增 --' } },
  { key: 'check.today', label: '今日打卡', sub: { key: 'check.total', text: '累计 --' } },
  { key: 'comment.total', label: '总评论数', sub: { key: 'comment.avgRating', text: '均分 --' } },
  { key: 'comment.pendingAudit', label: '待审核', sub: null }
]

let checkChart: echarts.ECharts | null = null
let ratingChart: echarts.ECharts | null = null
let rankingChart: echarts.ECharts | null = null

/** 嵌套路径取值，如 poi.active → overview.poi.active */
function flattenKey(obj: any, key: string): any {
  return key.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj)
}

/** 0 也要显示，仅 null/undefined 显示占位 */
function formatStat(val: unknown) {
  if (val === null || val === undefined || val === '') return '--'
  return val
}

async function fetchData() {
  // 概览与图表分开请求：避免某一图表接口失败导致整块数据不赋值
  try {
    const ov = await getGovStatsOverview()
    Object.assign(overview, ov.data)
  } catch {
    /* 拦截器已提示 */
  }
  try {
    const checkTrend = await getGovCheckTrend({ period: checkPeriod.value })
    renderCheckChart(checkTrend.data)
  } catch {
    /* 拦截器已提示 */
  }
  try {
    const rating = await getGovRatingDistribution()
    renderRatingChart(rating.data)
  } catch {
    /* 拦截器已提示 */
  }
  await fetchRanking()
}

async function fetchCheckTrend() {
  try {
    const checkTrend = await getGovCheckTrend({ period: checkPeriod.value })
    renderCheckChart(checkTrend.data)
  } catch {
    /* 拦截器已提示 */
  }
}

function renderCheckChart(data: any) {
  if (!checkChartRef.value) return
  const list = data?.trend ?? []
  if (!checkChart) checkChart = echarts.init(checkChartRef.value)
  const dates = list.map((d: any) => String(d.date).slice(5))
  const values = list.map((d: any) => d.checkCount)
  checkChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: values, smooth: true, areaStyle: { opacity: 0.15 }, color: '#e74c3c' }]
  })
}

function renderRatingChart(data: any) {
  if (!ratingChartRef.value) return
  if (!ratingChart) ratingChart = echarts.init(ratingChartRef.value)
  const labels = ['1星', '2星', '3星', '4星', '5星']
  const overall = data?.overall ?? []
  const dist = labels.map((_, i) => {
    const found = overall.find((r: any) => Math.round(r.rating) === i + 1)
    return found ? found.count : 0
  })
  ratingChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { top: '5%', right: '5%' },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      data: labels.map((label, i) => ({ name: label, value: dist[i] })),
      color: ['#f56c6c', '#e6a23c', '#909399', '#67c23a', '#409eff']
    }]
  })
}

async function fetchRanking() {
  try {
    const res = await getGovPoiRanking({ type: rankType.value, limit: 10 })
    renderRankingChart(res.data.ranking)
  } catch { /* handled by interceptor */ }
}

function renderRankingChart(ranking: any[]) {
  if (!rankingChartRef.value) return
  if (!rankingChart) rankingChart = echarts.init(rankingChartRef.value)
  const top10 = (ranking ?? []).slice(0, 10)
  const names = top10.map((p: any) => (p.poiName as string).slice(0, 10))
  const values = top10.map((p: any) => rankType.value === 'check' ? p.checkCount : p.avgRating)

  rankingChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: names, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: values,
      itemStyle: { color: '#e74c3c' },
      barWidth: '50%'
    }]
  })
}

onMounted(async () => {
  await fetchData()
  await nextTick()
  window.addEventListener('resize', () => {
    checkChart?.resize()
    ratingChart?.resize()
    rankingChart?.resize()
  })
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stats-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.card-label {
  font-size: 13px;
  color: #888;
  margin-bottom: 10px;
}

.card-value {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
}

.card-sub {
  font-size: 12px;
  color: #aaa;
  margin-top: 6px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.chart-card {
  background: #fff;
  border-radius: 10px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.today-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 8px 0;
}

.today-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.today-icon {
  font-size: 18px;
}

.today-value {
  font-weight: 600;
  color: #333;
  margin-left: auto;
}

.today-value.danger {
  color: #f56c6c;
}
</style>