<template>
  <div class="page-container">
    <div class="charts-grid">
      <el-card shadow="never">
        <template #header><span class="card-title">打卡趋势</span></template>
        <div ref="checkRef" style="height:300px"></div>
      </el-card>
      <el-card shadow="never">
        <template #header><span class="card-title">评分趋势</span></template>
        <div ref="ratingRef" style="height:300px"></div>
      </el-card>
    </div>
    <el-card shadow="never" style="margin-top:16px">
      <template #header>
        <span class="card-title">高峰时段分布</span>
      </template>
      <div ref="peakRef" style="height:280px"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getCheckTrend, getRatingTrend } from '@/api/modules/stats'

const checkRef = ref<HTMLElement>()
const ratingRef = ref<HTMLElement>()
const peakRef = ref<HTMLElement>()

async function fetchAndRender() {
  const [checkRes, ratingRes] = await Promise.all([getCheckTrend(), getRatingTrend()])
  const checkData = checkRes.data
  const ratingData = ratingRes.data

  // 打卡趋势
  const checkChart = echarts.init(checkRef.value!)
  checkChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['本期', '上期'] },
    xAxis: { type: 'category', data: checkData.trend30d.map((d: any) => d.date.slice(5)), boundaryGap: false },
    yAxis: { type: 'value' },
    series: [
      { name: '本期', type: 'line', data: checkData.trend30d.map((d: any) => d.checkCount), smooth: true, color: '#667eea', areaStyle: { opacity: 0.15 } },
      { name: '上期', type: 'line', data: checkData.lastWeek.map((d: any) => d.checkCount), smooth: true, color: '#ccc', lineStyle: { type: 'dashed' } }
    ]
  })

  // 评分趋势
  const ratingChart = echarts.init(ratingRef.value!)
  ratingChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ratingData.trend30d.map((d: any) => d.date.slice(5)), boundaryGap: false },
    yAxis: { type: 'value', min: 0, max: 5 },
    series: [{ type: 'line', data: ratingData.trend30d.map((d: any) => d.avgRating), smooth: true, color: '#764ba2', areaStyle: { opacity: 0.15 } }]
  })

  // 高峰时段
  const peakMap: Record<number, number> = {}
  for (const h of checkData.peakHours || []) peakMap[h.hour] = h.count
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  const peakChart = echarts.init(peakRef.value!)
  peakChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: hours },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: hours.map(h => peakMap[parseInt(h)] || 0), itemStyle: { color: '#667eea' } }]
  })

  window.addEventListener('resize', () => {
    checkChart.resize(); ratingChart.resize(); peakChart.resize()
  })
}

onMounted(async () => { await nextTick(); fetchAndRender() })
</script>

<style scoped>
.charts-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px }
.card-title { font-size:14px; font-weight:600 }
</style>