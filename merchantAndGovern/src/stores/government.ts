import { defineStore } from 'pinia'
import { ref } from 'vue'

interface GovernmentInfo {
  id: number
  username: string
  realName: string
  tel: string
  department: string
  role: number // 0: 超级管理员, 1: 普通管理员, 2: 审核员
  status: number
}

export const useGovernmentStore = defineStore('government', () => {
  const token = ref<string>(localStorage.getItem('gov_token') || '')
  const govInfo = ref<GovernmentInfo | null>(null)

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('gov_token', newToken)
  }

  function setGovInfo(info: GovernmentInfo) {
    govInfo.value = info
    localStorage.setItem('gov_info', JSON.stringify(info))
  }

  function logout() {
    token.value = ''
    govInfo.value = null
    localStorage.removeItem('gov_token')
    localStorage.removeItem('gov_info')
  }

  function initFromStorage() {
    const savedToken = localStorage.getItem('gov_token')
    const savedInfo = localStorage.getItem('gov_info')
    if (savedToken) token.value = savedToken
    if (savedInfo) govInfo.value = JSON.parse(savedInfo)
  }

  // 权限判断
  function isSuperAdmin(): boolean {
    return govInfo.value?.role === 0
  }

  function isAdmin(): boolean {
    return govInfo.value?.role === 0 || govInfo.value?.role === 1
  }

  function isAuditor(): boolean {
    return govInfo.value?.role === 2
  }

  initFromStorage()

  return {
    token,
    govInfo,
    setToken,
    setGovInfo,
    logout,
    isSuperAdmin,
    isAdmin,
    isAuditor
  }
})