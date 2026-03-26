import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { POI } from './poi'

export interface RouteDay {
    day: number
    pois: POI[]
    description?: string
}

export interface TravelRoute {
    id: string | number
    name: string
    title?: string
    days: number
    totalPoi?: number
    poiCount?: number
    schedule?: RouteDay[]
    tags?: string[]
    createdAt: string
    coverImage?: string
}

export const useRouteStore = defineStore('route', () => {
    const myRoutes = ref<TravelRoute[]>([])
    const currentRoute = ref<TravelRoute | null>(null)
    const generating = ref(false)
    const generateHistory = ref<string[]>([]) // 历史输入记录

    function setMyRoutes(list: TravelRoute[]) {
        myRoutes.value = list
    }

    function setCurrentRoute(route: TravelRoute) {
        currentRoute.value = route
    }

    function addRoute(route: TravelRoute) {
        myRoutes.value.unshift(route)
    }

    function removeRoute(id: string) {
        myRoutes.value = myRoutes.value.filter(r => r.id !== id)
    }

    function setGenerating(val: boolean) {
        generating.value = val
    }

    function addHistory(input: string) {
        if (!generateHistory.value.includes(input)) {
            generateHistory.value.unshift(input)
            if (generateHistory.value.length > 10) generateHistory.value.pop()
            uni.setStorageSync('routeHistory', JSON.stringify(generateHistory.value))
        }
    }

    function loadHistory() {
        const saved = uni.getStorageSync('routeHistory')
        if (saved) generateHistory.value = JSON.parse(saved)
    }

    return {
        myRoutes, currentRoute, generating, generateHistory,
        setMyRoutes, setCurrentRoute, addRoute, removeRoute,
        setGenerating, addHistory, loadHistory
    }
})
