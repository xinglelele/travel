import { mockRequest } from '../../mock/index'

/** true = mock 模式，false = 请求真实接口 */
const USE_MOCK = false

/** 本地开发用 http，生产环境用 https（上传接口和图片 URL 统一走此协议） */
const DEV_HTTP = true

/** 与 upload 等模块共用，勿在其它文件重复写死 */
export const BASE_URL = DEV_HTTP ? 'http://localhost:3000' : 'https://your-domain.com'

/** 统一处理图片 URL，开发环境强制 http，生产环境强制 https */
export function toHttpsImage(url: string): string {
    if (!url) return ''
    if (
        url.startsWith('wxfile://') ||
        url.startsWith('file://') ||
        url.startsWith('tmp/') ||
        url.startsWith('/tmp/') ||
        /^[a-z]:\\/i.test(url)
    ) {
        return '/static/logo.png'
    }
    if (DEV_HTTP) {
        if (url.startsWith('https://')) {
            return 'http://' + url.slice(8)
        }
        return url
    } else {
        if (url.startsWith('http://')) {
            return url.replace(/^http:\/\//, 'https://')
        }
        return url
    }
}

/** 递归处理对象中的图片 URL（用于 API 响应数据） */
function normalizeImages<T>(obj: T): T {
    if (Array.isArray(obj)) {
        return obj.map(item => normalizeImages(item)) as T
    }
    if (obj && typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) {
            const val = (obj as any)[key]
            // 常见图片字段
            if (key === 'images' || key === 'photos' || key === 'image' || key === 'photo' || key === 'avatar' || key === 'userAvatar' || key === 'coverImage' || key === 'cover') {
                if (Array.isArray(val)) {
                    result[key] = val.map((v: any) => typeof v === 'string' ? toHttpsImage(v) : normalizeImages(v))
                } else if (typeof val === 'string') {
                    result[key] = toHttpsImage(val)
                } else {
                    result[key] = normalizeImages(val)
                }
            } else {
                result[key] = normalizeImages(val)
            }
        }
        return result
    }
    return obj
}

interface RequestOptions {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: Record<string, unknown>
    header?: Record<string, string>
    /** 如果为 true，401 错误不会触发自动登出（适用于可选认证接口） */
    optionalAuth?: boolean
}

interface ApiResponse<T = unknown> {
    code: number
    message: string
    data: T
}

export function request<T = unknown>(options: RequestOptions): Promise<T> {
    if (USE_MOCK) {
        return new Promise(resolve => {
            // 路线生成接口模拟 LLM 思考延迟（2s），其余接口 150ms
            const delay = options.url === '/api/route/generate' ? 2000 : 150
            setTimeout(() => {
                const result = mockRequest(options.url, options.method ?? 'GET', options.data ?? {})
                resolve(result as T)
            }, delay)
        })
    }

    const token = uni.getStorageSync('token') as string
    const locale = (uni.getStorageSync('locale') as string) || 'zh-CN'
    const header: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept-Language': locale,
        ...options.header
    }
    if (token) header['Authorization'] = `Bearer ${token}`

    const m = (options.method || 'GET').toUpperCase()
    // 微信小程序端：对象 data 有时不会按 JSON 写入 body，express.json() 解析后 req.body 为空
    let requestBody: string | Record<string, unknown> | undefined = options.data
    if (
        options.data &&
        typeof options.data === 'object' &&
        (m === 'POST' || m === 'PUT' || m === 'DELETE')
    ) {
        requestBody = JSON.stringify(options.data)
    }

    return new Promise((resolve, reject) => {
        uni.request({
            url: `${BASE_URL}${options.url}`,
            method: options.method || 'GET',
            data: requestBody,
            header,
            success: (res) => {
                const raw = res.data
                const body =
                    raw !== null && typeof raw === 'object' && 'code' in raw
                        ? (raw as ApiResponse<T>)
                        : null
                const htmlErr = typeof raw === 'string' && raw.includes('<!DOCTYPE')
                    ? (raw.match(/<pre>([^<]+)<\/pre>/i)?.[1]?.trim() || raw.match(/Cannot GET\s+([^\s<]+)/i)?.[0] || '')
                    : ''
                const errMsg =
                    body?.message ||
                    htmlErr ||
                    (typeof raw === 'string' && raw.trim() && !htmlErr ? raw.slice(0, 80) : '')

                if (res.statusCode === 401) {
                    // 可选认证接口的 401 不触发登出、不弹 toast（由调用方处理）
                    if (!options.optionalAuth) {
                        uni.removeStorageSync('token')
                        uni.switchTab({ url: '/pages/home/index' })
                        const msg = errMsg || '登录已过期'
                        uni.showToast({ title: msg, icon: 'none' })
                        reject(new Error(msg))
                    } else {
                        reject(new Error(errMsg || '登录已过期'))
                    }
                    return
                }

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    if (body && body.code === 0) {
                        resolve(normalizeImages(body.data) as T)
                    } else if (body) {
                        uni.showToast({ title: body.message || '请求失败', icon: 'none' })
                        reject(new Error(body.message || '请求失败'))
                    } else {
                        uni.showToast({ title: '数据异常', icon: 'none' })
                        reject(new Error('数据异常'))
                    }
                    return
                }

                // 4xx/5xx：解析后端 JSON 中的 message（如 phone-login 返回 400）
                if (res.statusCode >= 400) {
                    const msg = errMsg || `请求失败 (${res.statusCode})`
                    uni.showToast({ title: msg, icon: 'none', duration: 2500 })
                    reject(new Error(msg))
                    return
                }

                uni.showToast({ title: '网络错误', icon: 'none' })
                reject(new Error(`HTTP ${res.statusCode}`))
            },
            fail: () => {
                uni.showToast({ title: '网络连接失败', icon: 'none' })
                reject(new Error('网络连接失败'))
            }
        })
    })
}

export const get = <T = unknown>(url: string, data?: Record<string, unknown>, optionalAuth = false) => {
    // 过滤 undefined / null，避免被序列化为字符串 "undefined" 传入后端
    const clean: Record<string, unknown> = {}
    if (data) {
        for (const [k, v] of Object.entries(data)) {
            if (v !== undefined && v !== null) clean[k] = v
        }
    }
    return request<T>({ url, method: 'GET', data: clean, optionalAuth })
}

export const post = <T = unknown>(url: string, data?: Record<string, unknown>, optionalAuth = false) =>
    request<T>({ url, method: 'POST', data, optionalAuth })

export const put = <T = unknown>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'PUT', data })

export const del = <T = unknown>(url: string) =>
    request<T>({ url, method: 'DELETE' })
