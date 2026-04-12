import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useMerchantStore } from '@/stores/merchant'
import { useGovernmentStore } from '@/stores/government'
import router from '@/router'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 优先使用政府端 Token（政府端使用 /gov 前缀）
    const govStore = useGovernmentStore()
    if (govStore.token) {
      config.headers.Authorization = `Bearer ${govStore.token}`
    } else {
      // 商户端 Token
      const merchantStore = useMerchantStore()
      if (merchantStore.token) {
        config.headers.Authorization = `Bearer ${merchantStore.token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code === 0) {
      return res
    }
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        ElMessage.error('登录已过期，请重新登录')
        // 判断是哪个端过期
        const govStore = useGovernmentStore()
        const merchantStore = useMerchantStore()
        if (govStore.token) {
          govStore.logout()
          router.push({ path: '/login', query: { portal: 'gov' } })
        } else {
          merchantStore.logout()
          router.push('/login')
        }
      } else if (status === 403) {
        ElMessage.error(data.message || '无权限访问')
      } else if (status === 400) {
        ElMessage.error(data.message || '请求参数错误')
      } else {
        ElMessage.error(data.message || '服务器错误')
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
    return Promise.reject(error)
  }
)

export default request
