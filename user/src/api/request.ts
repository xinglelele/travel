import { mockRequest } from '../../mock/index'

/** true = mock 模式，false = 请求真实接口 */
const USE_MOCK = true

const BASE_URL = 'https://api.example.com'

interface RequestOptions {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: Record<string, unknown>
    header?: Record<string, string>
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
                const response = res.data as ApiResponse<T>
                if (res.statusCode === 401) {
                    uni.removeStorageSync('token')
                    uni.switchTab({ url: '/pages/home/index' })
                    reject(new Error('登录已过期'))
                    return
                }
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    if (response.code === 0) {
                        resolve(response.data)
                    } else {
                        uni.showToast({ title: response.message || '请求失败', icon: 'none' })
                        reject(new Error(response.message))
                    }
                } else {
                    uni.showToast({ title: '网络错误', icon: 'none' })
                    reject(new Error(`HTTP ${res.statusCode}`))
                }
            },
            fail: () => {
                uni.showToast({ title: '网络连接失败', icon: 'none' })
                reject(new Error('网络连接失败'))
            }
        })
    })
}

export const get = <T = unknown>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'GET', data })

export const post = <T = unknown>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'POST', data })

export const put = <T = unknown>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'PUT', data })

export const del = <T = unknown>(url: string) =>
    request<T>({ url, method: 'DELETE' })
