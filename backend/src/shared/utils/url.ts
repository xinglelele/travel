import { env } from '../../config/env'

/**
 * 统一处理图片 URL
 * - 相对路径（如 /uploads/xxx.jpg）→ 补全为带域名的完整 URL
 * - 开发环境（useHttps=false）：强制 http
 * - 生产环境（useHttps=true）：强制 https
 */
export function normalizeUrl(url: string | undefined | null): string {
    if (!url) return url as string
    if (url.startsWith('http://') || url.startsWith('https://')) {
        if (env.useHttps) {
            if (url.startsWith('http://')) return url.replace(/^http:\/\//, 'https://')
        } else {
            if (url.startsWith('https://')) return 'http://' + url.slice(8)
        }
        return url
    }
    // 相对路径：补全 apiBaseUrl
    const base = env.useHttps
        ? env.apiBaseUrl.replace(/^http:\/\//, 'https://')
        : env.apiBaseUrl.replace(/^https:\/\//, 'http://')
    return `${base}${url}`
}

/**
 * 批量处理对象中常见图片字段（avatar, images, photos 等）
 */
export function normalizeImageFields<T>(obj: T): T {
    if (Array.isArray(obj)) {
        return obj.map(item => normalizeImageFields(item)) as T
    }
    if (obj && typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) {
            const val = (obj as any)[key]
            if (['images', 'photos', 'image', 'photo', 'avatar', 'userAvatar', 'coverImage'].includes(key)) {
                if (Array.isArray(val)) {
                    result[key] = val.map((v: any) => typeof v === 'string' ? normalizeUrl(v) : normalizeImageFields(v))
                } else if (typeof val === 'string') {
                    result[key] = normalizeUrl(val)
                } else {
                    result[key] = normalizeImageFields(val)
                }
            } else {
                result[key] = normalizeImageFields(val)
            }
        }
        return result
    }
    return obj
}
