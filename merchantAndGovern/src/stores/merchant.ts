import { defineStore } from 'pinia'
import { ref } from 'vue'

interface MerchantInfo {
  id: number
  merchantName: string
  tel: string
  status: number
  logo?: string
  email?: string
  contactPerson?: string
  merchantCategory?: string
  description?: string
  rejectReason?: string
  poiId?: number
}

export const useMerchantStore = defineStore('merchant', () => {
  const token = ref<string>(localStorage.getItem('merchant_token') || '')
  const merchantInfo = ref<MerchantInfo | null>(null)

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('merchant_token', newToken)
  }

  function setMerchantInfo(info: MerchantInfo) {
    merchantInfo.value = info
    localStorage.setItem('merchant_info', JSON.stringify(info))
  }

  function logout() {
    token.value = ''
    merchantInfo.value = null
    localStorage.removeItem('merchant_token')
    localStorage.removeItem('merchant_info')
  }

  function initFromStorage() {
    const savedToken = localStorage.getItem('merchant_token')
    const savedInfo = localStorage.getItem('merchant_info')
    if (savedToken) token.value = savedToken
    if (savedInfo) merchantInfo.value = JSON.parse(savedInfo)
  }

  initFromStorage()

  return {
    token,
    merchantInfo,
    setToken,
    setMerchantInfo,
    logout
  }
})
