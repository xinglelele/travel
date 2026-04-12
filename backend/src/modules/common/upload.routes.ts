import { Router, Request, Response } from 'express'
import axios from 'axios'
import { IncomingForm } from 'formidable'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { requiredAuth } from '../../shared/middleware/auth'
import { env } from '../../config/env'
import { successResponse, errorResponse } from '../../shared/utils/response'
import { translateZhToEn } from '../../external/qwen'

const router = Router()

function handleImageUpload(req: Request, res: Response): void {
  const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

  const form = new IncomingForm({
    uploadDir: UPLOAD_DIR,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
  })

  form.parse(req, (err, _fields, files) => {
    if (err) {
      res.status(400).json({ code: -1, message: '上传失败：' + err.message, data: null })
      return
    }

    const file = (files.file as any)?.[0] || (files.avatar as any)?.[0]
    if (!file) {
      res.status(400).json({ code: -1, message: '未找到上传文件', data: null })
      return
    }

    const mime = String((file as { mimetype?: string }).mimetype || '')
    if (!mime.startsWith('image/')) {
      try {
        fs.unlinkSync(file.filepath)
      } catch {
        /* ignore */
      }
      res.status(400).json({ code: -1, message: '仅支持上传图片文件', data: null })
      return
    }

    const ext = path.extname(file.originalFilename || file.filename || '')
    const filename = `${uuidv4()}${ext || '.jpg'}`
    const newPath = path.join(UPLOAD_DIR, filename)
    fs.renameSync(file.filepath, newPath)

    const url = `${env.apiBaseUrl}/uploads/${filename}`
    res.json({ code: 0, message: '上传成功', data: { url } })
  })
}

// 上传图片（需登录），保存到 backend/uploads/
router.post('/upload', requiredAuth, handleImageUpload)

// 注册页等未登录场景上传展示图（与 /upload 相同落盘规则，仅免登录）
router.post('/upload-register', handleImageUpload)

const TRANSLATE_MAX_CHARS = 4000

// POST /api/common/translate-zh-en — 中译英（公开，供注册页等未登录场景使用；上传仍须登录）
router.post('/translate-zh-en', async (req: Request, res: Response) => {
  try {
    const { text } = req.body
    if (!text || typeof text !== 'string' || !text.trim()) {
      return errorResponse(res, '待翻译文本不能为空', 400)
    }
    if (text.length > TRANSLATE_MAX_CHARS) {
      return errorResponse(res, `待翻译文本过长（最多 ${TRANSLATE_MAX_CHARS} 字）`, 400)
    }

    if (!env.openai.apiKey) {
      return errorResponse(res, '翻译服务未配置（OPENAI_API_KEY 缺失）', 500)
    }

    const translated = await translateZhToEn(text.trim())
    if (!translated) {
      return errorResponse(res, '翻译服务返回为空，请手动填写', 502)
    }
    return successResponse(res, { text: translated })
  } catch (err: any) {
    const detail = err?.response?.data || err?.message || '未知错误'
    console.error('[Translate] 中译英失败:', detail)
    return errorResponse(res, '翻译失败：' + (err?.message || '未知错误'), 500)
  }
})

/** 地理编码：地址 → GCJ-02 经纬度（服务端调高德 Web 服务 API，避免浏览器端 JS 插件超时/安全策略问题） */
router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const address = String(req.query.address || '').trim()
    if (!address) {
      return errorResponse(res, '地址不能为空', 400)
    }
    if (address.length > 200) {
      return errorResponse(res, '地址过长', 400)
    }
    if (!env.amap.key) {
      return errorResponse(res, '服务端未配置高德 Key（环境变量 AMAP_KEY），无法解析地址', 500)
    }

    const { data } = await axios.get<{
      status: string
      info: string
      geocodes?: Array<{ location: string }>
    }>('https://restapi.amap.com/v3/geocode/geo', {
      params: {
        key: env.amap.key,
        address,
        output: 'JSON',
      },
      timeout: 15000,
    })

    if (data.status === '1' && data.geocodes?.length) {
      const locStr = data.geocodes[0].location
      const parts = String(locStr).split(',')
      const lng = parseFloat(parts[0]?.trim() || '')
      const lat = parseFloat(parts[1]?.trim() || '')
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        return successResponse(res, { lng, lat })
      }
    }

    const hint =
      data.info === 'OK' || data.info === 'ok'
        ? '未找到该地址对应的坐标，请写得更完整或手动填写经纬度'
        : data.info || '地址解析失败'
    return errorResponse(res, hint, 400)
  } catch (err: unknown) {
    const msg = err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : '未知错误'
    console.error('[Geocode]', msg)
    return errorResponse(res, '地理编码请求失败，请检查网络或稍后重试', 502)
  }
})

export default router
