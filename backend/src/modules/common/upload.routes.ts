import { Router, Request, Response } from 'express'
import { IncomingForm } from 'formidable'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { requiredAuth } from '../../shared/middleware/auth'
import { env } from '../../config/env'

const router = Router()

// 上传图片（需登录），保存到 backend/uploads/
router.post('/upload', requiredAuth, (req: Request, res: Response) => {
  // uploads 目录已在 app.ts 中确保存在
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

    const ext = path.extname(file.originalFilename || file.filename || '')
    const filename = `${uuidv4()}${ext || '.jpg'}`
    const newPath = path.join(UPLOAD_DIR, filename)
    fs.renameSync(file.filepath, newPath)

    const url = `${env.apiBaseUrl}/uploads/${filename}`
    res.json({ code: 0, message: '上传成功', data: { url } })
  })
})

export default router
