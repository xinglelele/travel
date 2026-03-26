/**
 * Mock 拦截器入口
 * 根据请求 url + method 匹配并返回对应 mock 数据
 */
import { pois, heatmap } from './poi'
import { contents } from './content'
import { routes } from './route'
import { comments } from './comment'
import { messages } from './message'
import { checks } from './check'
import { loginResult, mockUser } from './user'
import { getCachedPoi, getAllCached, dbPoiToLocal } from '../src/utils/poi-cache'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export function mockRequest(url: string, method: Method = 'GET', data: Record<string, unknown> = {}): unknown {
    // ── POI ──────────────────────────────────────────
    if (url === '/api/poi/recommend') {
        const page = Number(data.page) || 1
        const size = Number(data.pageSize) || 10
        return { list: pois.slice((page - 1) * size, page * size), total: pois.length }
    }
    if (url === '/api/poi/nearby') {
        // 优先返回缓存的高德真实数据
        const cached = getAllCached()
        if (cached.length > 0) {
            const list = cached.map(dbPoiToLocal)
            return { list, total: list.length }
        }
        return { list: pois.slice(0, 5), total: 5 }
    }
    if (url === '/api/poi/heatmap') {
        return heatmap
    }
    if (/^\/api\/poi\/[\w-]+$/.test(url) && method === 'GET') {
        const id = url.split('/').pop() || ''
        // 优先从高德缓存查
        const cached = getCachedPoi(id)
        if (cached) {
            console.log(`[Mock] POI id "${id}" 命中缓存`)
            return dbPoiToLocal(cached)
        }
        // fallback: mock 静态数据
        const found = pois.find(p => p.id === id)
        if (!found) console.warn(`[Mock] POI id "${id}" 未匹配，返回 pois[0]`)
        return found ?? pois[0]
    }

    // ── 内容 ─────────────────────────────────────────
    if (url === '/api/content/recommend') {
        const page = Number(data.page) || 1
        const size = Number(data.pageSize) || 10
        const cat = data.category as string | undefined
        const list = cat ? contents.filter(c => c.category === cat) : contents
        return { list: list.slice((page - 1) * size, page * size), total: list.length }
    }
    if (/^\/api\/content\/[\w-]+$/.test(url) && method === 'GET') {
        const id = url.split('/').pop()
        return contents.find(c => c.id === id) ?? contents[0]
    }
    if (url.endsWith('/view') && method === 'POST') {
        return null
    }

    // ── 路线 ─────────────────────────────────────────
    if (url === '/api/route/generate' && method === 'POST') {
        // 优先用缓存的真实高德 POI 构建路线
        const cached = getAllCached()
        const localPois = cached.length > 0 ? cached.map(dbPoiToLocal) : pois
        const prompt = String(data.prompt || '')
        const days = Number(data.days) || 2
        // 按天分配 POI（每天最多 3 个）
        const schedule = Array.from({ length: days }, (_, i) => {
            const dayPois = localPois.slice(i * 3, i * 3 + 3)
            return {
                day: i + 1,
                description: i === 0 ? '经典景点游览' : i === 1 ? '深度文化体验' : '休闲购物之旅',
                pois: dayPois.length > 0 ? dayPois : localPois.slice(0, 2)
            }
        })
        // 注意：这里返回的是同步数据，延迟由 request.ts 统一控制
        // 路线生成 mock 需要更长延迟，在 request.ts 里对该接口单独处理
        return {
            id: `route-${Date.now()}`,
            title: `AI规划：${prompt.slice(0, 20) || '个性化路线'}`,
            days,
            totalPoi: schedule.reduce((s, d) => s + d.pois.length, 0),
            schedule,
            tags: ['AI规划'],
            createdAt: new Date().toISOString()
        }
    }
    if (url === '/api/route/my') {
        return { list: routes, total: routes.length }
    }
    if (url === '/api/route/save' && method === 'POST') {
        return data
    }
    if (/^\/api\/route\/[\w-]+$/.test(url) && method === 'GET') {
        const id = url.split('/').pop()
        return routes.find(r => r.id === id) ?? routes[0]
    }
    if (/^\/api\/route\/[\w-]+$/.test(url) && method === 'DELETE') {
        return null
    }

    // ── 评论 ─────────────────────────────────────────
    if (url === '/api/comment/list') {
        const poiId = data.poiId as string
        const pageSize = Number(data.pageSize) || 20
        // poiId 有值时按 poiId 过滤，过滤结果为空则返回全部（兜底，避免高德 id 匹配不到 mock 数据）
        let list = poiId ? comments.filter(c => c.poiId === poiId) : comments
        if (list.length === 0) list = comments
        list = list.slice(0, pageSize)
        const avg = list.length ? list.reduce((s, c) => s + c.rating, 0) / list.length : 0
        const dist: Record<string, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        list.forEach(c => { dist[c.rating] = (dist[c.rating] || 0) + 1 })
        return { list, total: list.length, stats: { avgRating: avg, total: list.length, distribution: dist } }
    }
    if (url === '/api/comment/create' && method === 'POST') {
        return { id: `c-${Date.now()}`, userId: 'u-mock', userNickname: '我', userAvatar: '', ...data, createdAt: new Date().toISOString(), helpfulCount: 0 }
    }

    // ── 搜索 ─────────────────────────────────────────
    if (url === '/api/search') {
        const kw = String(data.keyword || '').toLowerCase()
        const matchedPois = pois.filter(p => p.name.includes(kw) || p.description.includes(kw))
        const matchedRoutes = routes.filter(r => r.title.includes(kw))
        const matchedContents = contents.filter(c => c.title.includes(kw) || c.summary.includes(kw))
        return { pois: matchedPois, routes: matchedRoutes, contents: matchedContents, total: matchedPois.length + matchedRoutes.length + matchedContents.length }
    }
    if (url === '/api/search/suggest') {
        const kw = String(data.keyword || '')
        return pois.filter(p => p.name.includes(kw)).slice(0, 5).map(p => ({ keyword: p.name, type: 'poi' }))
    }

    // ── 消息 ─────────────────────────────────────────
    if (url === '/api/message/list') {
        return { list: messages, total: messages.length, unread: messages.filter(m => !m.isRead).length }
    }
    if (/\/api\/message\/.+\/read/.test(url) && method === 'POST') {
        return null
    }
    if (url === '/api/message/read-all' && method === 'POST') {
        return null
    }

    // ── 打卡 ─────────────────────────────────────────
    if (url === '/api/check/my') {
        return { list: checks, total: checks.length }
    }
    if (url === '/api/check/create' && method === 'POST') {
        const poi = pois.find(p => p.id === data.poiId) ?? pois[0]
        return { id: `chk-${Date.now()}`, poiId: data.poiId, poiName: poi.name, poiImage: poi.images[0], latitude: data.latitude, longitude: data.longitude, checkedAt: new Date().toISOString(), note: data.note || '' }
    }

    // ── 用户 ─────────────────────────────────────────
    if (url === '/api/user/login' && method === 'POST') {
        return loginResult
    }
    if (url === '/api/user/profile' && method === 'GET') {
        return mockUser
    }
    if (url === '/api/user/profile' && method === 'PUT') {
        return { ...mockUser, ...data }
    }
    if (url === '/api/user/preference' && method === 'POST') {
        return null
    }

    console.warn(`[Mock] 未匹配的接口: ${method} ${url}`)
    return null
}
