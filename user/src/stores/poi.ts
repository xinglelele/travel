import { defineStore } from 'pinia'
import { ref } from 'vue'
import { toHttpsImage } from '../utils/amap-config'

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

/** 统一处理 POI 图片，确保都是 HTTPS */
function normalizePoiImages(poi: POI): POI {
    return {
        ...poi,
        images: poi.images.map(img => toHttpsImage(img))
    }
}

export const usePoiStore = defineStore('poi', () => {
    const recommendList = ref<POI[]>([])
    const nearbyList = ref<POI[]>([])
    const currentPoi = ref<POI | null>(null)
    const heatmapData = ref<Array<{ latitude: number; longitude: number; weight: number }>>([])
    const loading = ref(false)

    function setRecommendList(list: POI[]) {
        recommendList.value = list.map(normalizePoiImages)
    }

    function setNearbyList(list: POI[]) {
        nearbyList.value = list.map(normalizePoiImages)
    }

    function setCurrentPoi(poi: POI) {
        currentPoi.value = normalizePoiImages(poi)
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
