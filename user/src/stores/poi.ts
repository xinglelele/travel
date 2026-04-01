import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface POI {
    id: string
    poiId?: number  // 数据库主键，AI生成时由后端回填
    name: string
    category: string
    description: string
    images: string[]
    latitude: number
    longitude: number
    address: string
    openTime?: string
    ticketPrice?: number
    phone?: string
    rating: number
    commentCount: number
    distance?: number
    tags?: string[]
}

export const usePoiStore = defineStore('poi', () => {
    const recommendList = ref<POI[]>([])
    const nearbyList = ref<POI[]>([])
    const currentPoi = ref<POI | null>(null)
    const heatmapData = ref<Array<{ latitude: number; longitude: number; weight: number }>>([])
    const loading = ref(false)

    function setRecommendList(list: POI[]) {
        recommendList.value = list
    }

    function setNearbyList(list: POI[]) {
        nearbyList.value = list
    }

    function setCurrentPoi(poi: POI) {
        currentPoi.value = poi
    }

    function setHeatmapData(data: typeof heatmapData.value) {
        heatmapData.value = data
    }

    function setLoading(val: boolean) {
        loading.value = val
    }

    return {
        recommendList, nearbyList, currentPoi, heatmapData, loading,
        setRecommendList, setNearbyList, setCurrentPoi, setHeatmapData, setLoading
    }
})
