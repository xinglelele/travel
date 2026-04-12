<template>
  <div class="login-page" :class="{ 'login-page--gov': step === 'government' }">
    <div class="login-card">
      <!-- 步骤1：选择登录角色 -->
      <template v-if="step === 'select'">
        <div class="login-header">
          <div class="logo-icon logo-icon--unified">旅</div>
          <h2>智慧旅游平台</h2>
          <p>请选择登录入口</p>
        </div>

        <div class="role-cards">
          <button type="button" class="role-card role-card--merchant" @click="chooseRole('merchant')">
            <span class="role-card__icon">商</span>
            <span class="role-card__title">商户端登录</span>
            <span class="role-card__desc">管理门店、景点与经营数据</span>
          </button>
          <button type="button" class="role-card role-card--gov" @click="chooseRole('government')">
            <span class="role-card__icon">政</span>
            <span class="role-card__title">政府端登录</span>
            <span class="role-card__desc">监管运营、审核与内容管理</span>
          </button>
        </div>
      </template>

      <!-- 步骤2a：商户登录 -->
      <template v-else-if="step === 'merchant'">
        <div class="login-header">
          <div class="logo-icon">商</div>
          <h2>商户登录</h2>
          <p>智慧旅游平台 · 商户端</p>
        </div>

        <el-form ref="merchantFormRef" :model="merchantForm" :rules="merchantRules" class="login-form" @submit.prevent="handleMerchantLogin">
          <el-form-item prop="tel">
            <el-input
              v-model="merchantForm.tel"
              placeholder="请输入手机号"
              size="large"
              :prefix-icon="Iphone"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="merchantForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="handleMerchantLogin"
            />
          </el-form-item>

          <div class="form-actions">
            <el-link type="primary" :underline="false" @click="$router.push('/register')">立即注册</el-link>
            <el-link type="primary" :underline="false" @click="showResetDialog = true">忘记密码？</el-link>
          </div>

          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="handleMerchantLogin"
          >
            登录
          </el-button>
        </el-form>

        <div class="login-footer">
          <el-link type="info" :underline="false" @click="backToSelect">← 返回选择入口</el-link>
        </div>
      </template>

      <!-- 步骤2b：政府端登录 -->
      <template v-else-if="step === 'government'">
        <div class="login-header">
          <div class="logo-icon logo-icon--gov">政</div>
          <h2>政府端登录</h2>
          <p>智慧旅游平台 · 监管运营后台</p>
        </div>

        <el-form ref="govFormRef" :model="govForm" :rules="govRules" class="login-form" @submit.prevent="handleGovLogin">
          <el-form-item prop="username">
            <el-input
              v-model="govForm.username"
              placeholder="请输入用户名"
              size="large"
              :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="govForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="handleGovLogin"
            />
          </el-form-item>

          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="handleGovLogin"
          >
            登录
          </el-button>
        </el-form>

        <div class="login-footer">
          <el-link type="info" :underline="false" @click="backToSelect">← 返回选择入口</el-link>
        </div>
      </template>
    </div>

    <!-- 重置密码弹窗（仅商户） -->
    <el-dialog v-model="showResetDialog" title="找回密码" width="420px" destroy-on-close>
      <el-form ref="resetFormRef" :model="resetForm" :rules="resetRules" label-width="80px">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="resetForm.phone" placeholder="请输入注册手机号" />
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <el-input v-model="resetForm.code" placeholder="请输入验证码" style="width: 160px" />
          <el-button
            style="margin-left: 12px"
            :disabled="countdown > 0"
            @click="handleSendCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
          </el-button>
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="resetForm.password" type="password" show-password placeholder="6位以上密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showResetDialog = false">取消</el-button>
        <el-button type="primary" :loading="resetLoading" @click="handleReset">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { Iphone, Lock, User } from '@element-plus/icons-vue'
import { merchantLogin, sendSmsCode, resetPassword } from '@/api/modules/merchant'
import { govLogin } from '@/api/modules/government'
import { useMerchantStore } from '@/stores/merchant'
import { useGovernmentStore } from '@/stores/government'

type LoginStep = 'select' | 'merchant' | 'government'

const route = useRoute()
const router = useRouter()
const merchantStore = useMerchantStore()
const govStore = useGovernmentStore()

const step = ref<LoginStep>('select')

function portalFromQuery(): LoginStep | null {
  const p = route.query.portal
  const v = Array.isArray(p) ? p[0] : p
  if (v === 'merchant' || v === 'gov' || v === 'government') {
    return v === 'gov' || v === 'government' ? 'government' : 'merchant'
  }
  return null
}

function applyQueryPortal() {
  const p = portalFromQuery()
  if (p) step.value = p
  else step.value = 'select'
}

onMounted(() => {
  applyQueryPortal()
})

watch(
  () => route.query.portal,
  () => applyQueryPortal()
)

function chooseRole(role: 'merchant' | 'government') {
  step.value = role
  router.replace({ path: '/login', query: { portal: role === 'government' ? 'gov' : 'merchant' } })
}

function backToSelect() {
  step.value = 'select'
  router.replace({ path: '/login' })
}

// —— 商户 ——
const merchantFormRef = ref<FormInstance>()
const merchantForm = reactive({ tel: '', password: '' })
const merchantRules: FormRules = {
  tel: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

// —— 政府 ——
const govFormRef = ref<FormInstance>()
const govForm = reactive({ username: '', password: '' })
const govRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const loading = ref(false)

async function handleMerchantLogin() {
  if (!merchantFormRef.value) return
  await merchantFormRef.value.validate()
  loading.value = true
  try {
    const res = await merchantLogin(merchantForm)
    merchantStore.setToken(res.data.token)
    merchantStore.setMerchantInfo(res.data.merchant)
    ElMessage.success('登录成功')
    router.push('/merchant/dashboard')
  } finally {
    loading.value = false
  }
}

async function handleGovLogin() {
  if (!govFormRef.value) return
  await govFormRef.value.validate()
  loading.value = true
  try {
    const res = await govLogin(govForm)
    govStore.setToken(res.data.token)
    govStore.setGovInfo(res.data.government)
    ElMessage.success('登录成功')
    router.push('/gov/dashboard')
  } finally {
    loading.value = false
  }
}

// 重置密码
const showResetDialog = ref(false)
const resetFormRef = ref<FormInstance>()
const resetForm = reactive({ phone: '', code: '', password: '' })
const resetRules: FormRules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  password: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }]
}
const countdown = ref(0)
const resetLoading = ref(false)

let timer: ReturnType<typeof setInterval>
async function handleSendCode() {
  if (!resetForm.phone) { ElMessage.warning('请先输入手机号'); return }
  await sendSmsCode({ phone: resetForm.phone, type: 'reset' })
  ElMessage.success('验证码已发送')
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function handleReset() {
  if (!resetFormRef.value) return
  await resetFormRef.value.validate()
  resetLoading.value = true
  try {
    await resetPassword(resetForm)
    ElMessage.success('密码重置成功，请登录')
    showResetDialog.value = false
    merchantForm.tel = resetForm.phone
    merchantForm.password = ''
  } finally {
    resetLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.35s ease;
}

.login-page--gov {
  /* background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); */
  background: linear-gradient(135deg, #e97676 0%, #c95a5a 100%);
  /* background: linear-gradient(135deg, #e26565 0%, #c15252 100%); */
}

.login-card {
  width: 400px;
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.logo-icon--gov {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.logo-icon--unified {
  background: linear-gradient(135deg, #5b7cfa, #8b5cf6);
}

.login-header h2 {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 6px;
}

.login-header p {
  font-size: 13px;
  color: #999;
}

.role-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.role-card {
  width: 100%;
  text-align: left;
  padding: 20px 20px 20px 72px;
  position: relative;
  border: 2px solid #eef0f4;
  border-radius: 12px;
  background: #fafbfc;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}

.role-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.12);
  transform: translateY(-1px);
}

.role-card--gov:hover {
  border-color: #f5b7b1;
  box-shadow: 0 8px 24px rgba(231, 76, 60, 0.12);
}

.role-card__icon {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-card--merchant .role-card__icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.role-card--gov .role-card__icon {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.role-card__title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.role-card__desc {
  display: block;
  font-size: 12px;
  color: #888;
  line-height: 1.4;
}

.login-form {
  margin-top: 0;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  font-size: 13px;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  border-radius: 8px;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
}
</style>
