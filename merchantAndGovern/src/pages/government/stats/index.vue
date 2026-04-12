<template>
  <div class="page-container">
    <!-- 指标卡片行 -->
    <div class="card-grid">
      <div class="stats-card" v-for="card in statsCards" :key="card.key">
        <div class="card-label">{{ card.label }}</div>
        <div class="card-value">{{ getNestedValue(overview, card.key) ?? '--' }}</div>
        <div class="card-sub" v-if="card.sub">{{ card.sub }}</div>
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

    <!-- POI 排行榜 -->
    <div class="charts-row">
      <el-card class="chart-card" shadow="never">
        <template #header>
          <span class="card-title">景点热榜</span>
          <el-radio-group v-model="rankType" size="small" style="float:right" @change="fetchRanking">
            <el-radio-button value="check">打卡量</el-radio-button>
            <el-radio-button value="rating">评分</el-radio-button>
          </el-radio-group>
        </template>
        <div ref="rankingChartRef" style="height: 280px"></div>
      </el-card>
      <el-card class="chart-card" shadow="never">
        <template #header><span class="card-title">数据总览</span></template>
        <div class="overview-grid">
          <div class="overview-item">
            <div class="overview-label">景点总数</div>
            <div class="overview-val">{{ overview.poi?.total ?? 0 }}</div>
          </div>
          <div class="overview-item">
            <div class="overview-label">在线景点</div>
            <div class="overview-val">{{ overview.poi?.active ?? 0 }}</div>
          </div>
          <div class="overview-item">
            <div class="overview-label">商户总数</div>
            <div class="overview-val">{{ overview.merchant?.total ?? 0 }}</div>
          </div>
          <div class="overview-item">
            <div class="overview-label">注册用户</div>
            <div class="overview-val">{{ overview.user?.total ?? 0 }}</div>
          </div>
          <div class="overview-item">
            <div class="overview-label">本月新增用户</div>
            <div class="overview-val">{{ overview.user?.newThisMonth ?? 0 }}</div>
          </div>
          <div class="overview-item">
            <div class="overview-label">总打卡数</div>
            <div class="overview-val">{{ overview.check?.total ?? 0 }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 打卡热力图 -->
    <div class="charts-row full-width">
      <el-card class="chart-card heatmap-card" shadow="never">
        <template #header>
          <div class="header-left">
            <span class="card-title">打卡热力图</span>
            <span class="card-subtitle">按时间维度展示打卡密度分布</span>
          </div>
        </template>
        <CheckHeatmap />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getGovStatsOverview, getGovCheckTrend, getGovRatingDistribution, getGovPoiRanking } from '@/api/modules/government'
import CheckHeatmap from './components/CheckHeatmap.vue'

const checkChartRef = ref<HTMLElement>()
const ratingChartRef = ref<HTMLElement>()
const rankingChartRef = ref<HTMLElement>()

const checkPeriod = ref('30d')
const rankType = ref('check')

const overview = reactive<any>({
  poi: { total: 0, active: 0 },
  merchant: { total: 0 },
  user: { total: 0, newThisMonth: 0 },
  check: { total: 0 }
})

const statsCards = [
  { key: 'poi.active', label: '在线景点', sub: `共 ${overview.poi?.total ?? 0} 个` },
  { key: 'merchant.total', label: '商户总数', sub: null },
  { key: 'user.total', label: '注册用户', sub: `本月新增 ${overview.user?.newThisMonth ?? 0}` },
  { key: 'check.total', label: '累计打卡', sub: null },
  { key: 'poi.todayAudit', label: '待审核景点', sub: null },
  { key: 'comment.pendingAudit', label: '待审核评论', sub: null }
]

let checkChart: echarts.ECharts | null = null
let ratingChart: echarts.ECharts | null = null
let rankingChart: echarts.ECharts | null = null

function getNestedValue(obj: any, key: string): any {
  return key.split('.').reduce((o, k) => (o ? o[k] : null), obj)
}

async function fetchData() {
  try {
    const res = await getGovStatsOverview()
    Object.assign(overview, res.data)
    await fetchCheckTrend()
    await fetchRatingDist()
    await fetchRanking()
  } catch { /* handled by interceptor */ }
}

async function fetchCheckTrend() {
  try {
    const res = await getGovCheckTrend({ period: checkPeriod.value })
    renderCheckChart(res.data)
  } catch {}
}

function renderCheckChart(data: any) {
  if (!checkChartRef.value) return
  checkChart = echarts.init(checkChartRef.value)
  const dates = (data.trend || []).map((d: any) => d.date?.slice(5) || '')
  const values = (data.trend || []).map((d: any) => d.checkCount || 0)
  checkChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: values, smooth: true, areaStyle: { opacity: 0.15 }, color: '#e74c3c' }]
  })
}

async function fetchRatingDist() {
  try {
    const res = await getGovRatingDistribution()
    renderRatingChart(res.data)
  } catch {}
}

function renderRatingChart(data: any) {
  if (!ratingChartRef.value) return
  ratingChart = echarts.init(ratingChartRef.value)
  const labels = ['1星', '2星', '3星', '4星', '5星']
  const dist = labels.map((_, i) => {
    const found = (data.overall || []).find((r: any) => Math.round(r.rating) === i + 1)
    return found ? found.count : 0
  })
  ratingChart.setOption({
    tooltip: { trigger: 'item' },
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
    renderRankingChart(res.data.ranking || [])
  } catch {}
}

function renderRankingChart(ranking: any[]) {
  if (!rankingChartRef.value) return
  rankingChart = echarts.init(rankingChartRef.value)
  const top10 = ranking.slice(0, 10)
  const names = top10.map((p: any) => (p.poiName as string || '').slice(0, 10))
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
.page-container { padding: 20px; }
.card-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 20px; }
.stats-card { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.card-label { font-size: 13px; color: #888; margin-bottom: 10px; }
.card-value { font-size: 26px; font-weight: 700; color: #1a1a1a; line-height: 1; }
.card-sub { font-size: 12px; color: #aaa; margin-top: 6px; }
.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.charts-row.full-width { grid-template-columns: 1fr; }
.chart-card { background: #fff; border-radius: 10px; }
.card-title { font-size: 14px; font-weight: 600; color: #333; }
.header-left { display: flex; align-items: center; gap: 10px; }
.card-subtitle { font-size: 12px; color: #909399; font-weight: 400; }
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 8px 0; }
.overview-item { display: flex; flex-direction: column; gap: 4px; }
.overview-label { font-size: 13px; color: #888; }
.overview-val { font-size: 22px; font-weight: 700; color: #1a1a1a; }
</style>
