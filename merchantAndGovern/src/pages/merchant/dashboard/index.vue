<template>
  <div class="page-container">
    <!-- 指标卡片行 -->
    <div class="card-grid">
      <div class="stats-card" v-for="card in statsCards" :key="card.key">
        <div class="card-label">{{ card.label }}</div>
        <div class="card-value">{{ overview[card.key as keyof typeof overview] ?? '--' }}</div>
        <div class="card-trend" :class="getTrendClass(card)" v-if="card.trend">
          <span v-if="Number(overview[card.trendKey as keyof typeof overview]) > 0">
            {{ Number(overview[card.trendKey as keyof typeof overview]) > 0 ? '↑' : '↓' }}
            {{ Math.abs(Number(overview[card.trendKey as keyof typeof overview])) }}%
          </span>
          <span v-else class="neutral">—</span>
        </div>
      </div>
    </div>

    <!-- 图表行 -->
    <div class="charts-row">
      <el-card class="chart-card" shadow="never">
        <template #header><span class="card-title">近30天打卡趋势</span></template>
        <div ref="checkChartRef" style="height: 280px"></div>
      </el-card>
      <el-card class="chart-card" shadow="never">
        <template #header><span class="card-title">评分分布</span></template>
        <div ref="ratingChartRef" style="height: 280px"></div>
      </el-card>
    </div>

    <!-- 第二行图表 -->
    <div class="charts-row">
      <el-card class="chart-card" shadow="never">
        <template #header><span class="card-title">本月收入趋势</span></template>
        <div ref="revenueChartRef" style="height: 280px"></div>
      </el-card>
      <el-card class="chart-card" shadow="never">
        <template #header><span class="card-title">高峰时段分布</span></template>
        <div ref="peakChartRef" style="height: 280px"></div>
      </el-card>
    </div>

    <!-- AI 报告入口 -->
    <el-card shadow="never" class="ai-report-card">
      <div class="ai-report-content">
        <div class="ai-left">
          <el-icon class="ai-icon" :size="32"><MagicStick /></el-icon>
          <div class="ai-text">
            <h3>AI 经营分析报告</h3>
            <p>基于近30天客流、评价、票务数据，AI 自动生成运营分析报告</p>
          </div>
        </div>
        <el-button type="primary" @click="goAiReport">生成报告</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getStatsOverview, getCheckTrend, getRatingTrend } from '@/api/modules/stats'
import { MagicStick } from '@element-plus/icons-vue'

const router = useRouter()
const checkChartRef = ref<HTMLElement>()
const ratingChartRef = ref<HTMLElement>()
const revenueChartRef = ref<HTMLElement>()
const peakChartRef = ref<HTMLElement>()

const overview = reactive<any>({
  todayCheck: 0, todayCheckTrend: 0,
  totalCheck: 0, totalCheckTrend: 0,
  avgRating: 0, ratingTrend: 0,
  pendingReply: 0,
  todayNewComments: 0, commentTrend: 0,
  onSaleTickets: 0,
  totalFavorites: 0
})

const statsCards = [
  { key: 'todayCheck', label: '今日打卡', trend: true, trendKey: 'todayCheckTrend' },
  { key: 'totalCheck', label: '累计打卡', trend: true, trendKey: 'totalCheckTrend' },
  { key: 'avgRating', label: '平均评分', trend: false },
  { key: 'pendingReply', label: '待回复评价', trend: false },
  { key: 'todayNewComments', label: '今日新增评价', trend: true, trendKey: 'commentTrend' },
  { key: 'onSaleTickets', label: '在售票种', trend: false }
]

function getTrendClass(card: any) {
  const val = Number(overview[card.trendKey as keyof typeof overview])
  return val >= 0 ? 'up' : 'down'
}

let checkChart: echarts.ECharts | null = null
let ratingChart: echarts.ECharts | null = null
let peakChart: echarts.ECharts | null = null

async function fetchData() {
  try {
    const [ov, trend, rating] = await Promise.all([
      getStatsOverview(),
      getCheckTrend(),
      getRatingTrend()
    ])
    Object.assign(overview, ov.data)
    renderCheckChart(trend.data)
    renderRatingChart(rating.data)
    renderPeakChart(trend.data)
    renderRevenueChart()
  } catch (e) { /* handled by interceptor */ }
}

function renderCheckChart(data: any) {
  if (!checkChartRef.value) return
  checkChart = echarts.init(checkChartRef.value)
  const dates = data.trend30d.map((d: any) => d.date.slice(5))
  const values = data.trend30d.map((d: any) => d.checkCount)
  const lastWeekDates = data.lastWeek.map((d: any) => d.date.slice(5))
  const lastWeekValues = data.lastWeek.map((d: any) => d.checkCount)

  checkChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['本期', '上期'] },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [
      { name: '本期', type: 'line', data: values, smooth: true, areaStyle: { opacity: 0.2 }, color: '#667eea' },
      { name: '上期', type: 'line', data: lastWeekValues, smooth: true, color: '#ccc', lineStyle: { type: 'dashed' } }
    ]
  })
}

function renderRatingChart(data: any) {
  if (!ratingChartRef.value) return
  ratingChart = echarts.init(ratingChartRef.value)
  const dist = [0, 0, 0, 0, 0]
  for (const r of data.ratingDistribution) {
    const idx = Math.round(r.rating) - 1
    if (idx >= 0 && idx < 5) dist[idx] = r.count
  }
  ratingChart.setOption({
    tooltip: { trigger: 'item' },
    xAxis: { type: 'category', data: ['1星', '2星', '3星', '4星', '5星'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: dist, itemStyle: { color: '#764ba2' }, barWidth: '50%' }]
  })
}

function renderPeakChart(data: any) {
  if (!peakChartRef.value) return
  peakChart = echarts.init(peakChartRef.value)
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  const hourMap = Object.fromEntries(data.peakHours?.map((h: any) => [h.hour, h.count]) || [])
  const values = hours.map(h => hourMap[parseInt(h)] || 0)

  peakChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: hours },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: values, itemStyle: { color: '#667eea' } }]
  })
}

function renderRevenueChart() {
  if (!revenueChartRef.value) return
  const chart = echarts.init(revenueChartRef.value)
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
  const values = days.map(() => Math.floor(Math.random() * 5000 + 500))

  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: days, boundaryGap: false },
    yAxis: { type: 'value', name: '元' },
    series: [{
      type: 'line',
      data: values,
      smooth: true,
      color: '#67c23a',
      areaStyle: { opacity: 0.15 }
    }]
  })
}

onMounted(async () => {
  await fetchData()
  await nextTick()
  window.addEventListener('resize', () => {
    checkChart?.resize()
    ratingChart?.resize()
    peakChart?.resize()
  })
})

function goAiReport() {
  router.push('/merchant/stats/report')
}
</script>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stats-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.card-label {
  font-size: 13px;
  color: #888;
  margin-bottom: 10px;
}

.card-value {
  font-size: 30px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
}

.card-trend {
  font-size: 12px;
  margin-top: 8px;
}

.up { color: #67c23a; }
.down { color: #f56c6c; }
.neutral { color: #999; }

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

.ai-report-card {
  background: linear-gradient(135deg, #667eea18, #764ba218);
  border: 1px solid #667eea30;
}

.ai-report-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.ai-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ai-icon {
  color: #667eea;
}

.ai-text h3 {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.ai-text p {
  font-size: 13px;
  color: #888;
}
</style>