import { mockRequest } from '../../mock/index'

/** true = mock 模式，false = 请求真实接口 */
const USE_MOCK = false

const BASE_URL = 'http://localhost:3000'

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

    return new Promise((resolve, reject) => {
        uni.request({
            url: `${BASE_URL}${options.url}`,
            method: options.method || 'GET',
            data: options.data,
            header,
            success: (res) => {
                const raw = res.data
                const body =
                    raw !== null && typeof raw === 'object' && 'code' in raw
                        ? (raw as ApiResponse<T>)
                        : null
                const errMsg =
                    body?.message ||
                    (typeof raw === 'string' && raw.trim() ? raw : '')

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
                        resolve(body.data as T)
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
                    uni.showToast({ title: msg, icon: 'none' })
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

export const get = <T = unknown>(url: string, data?: Record<string, unknown>, optionalAuth = false) =>
    request<T>({ url, method: 'GET', data, optionalAuth })

export const post = <T = unknown>(url: string, data?: Record<string, unknown>, optionalAuth = false) =>
    request<T>({ url, method: 'POST', data, optionalAuth })

export const put = <T = unknown>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'PUT', data })

export const del = <T = unknown>(url: string) =>
    request<T>({ url, method: 'DELETE' })
