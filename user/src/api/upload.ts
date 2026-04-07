import { BASE_URL } from './request'

/** 上传本地文件（头像、评论图片等），返回服务器 URL */
export function uploadFile(tempFilePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = (uni.getStorageSync('token') as string) || ''
    uni.uploadFile({
      url: `${BASE_URL}/api/common/upload`,
      filePath: tempFilePath,
      name: 'file',
      header: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 0 && data.data?.url) {
            resolve(data.data.url)
          } else {
            reject(new Error(data.message || '上传失败'))
          }
        } catch {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '上传失败'))
      }
    })
  })
}
