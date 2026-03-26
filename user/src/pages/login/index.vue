<template>
  <view class="login-page">
    <!-- 关闭按钮 -->
    <view class="close-btn" @tap="onClose">
      <text class="icon-close">✕</text>
    </view>

    <!-- Logo 区域 -->
    <view class="logo-section">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="app-name">智慧旅游平台</text>
    </view>

    <!-- 表单区域 -->
    <view class="form-section">
      <!-- 手机号 -->
      <view class="input-group">
        <text class="input-label">手机号</text>
        <input
          class="input-field"
          v-model="form.phone"
          type="number"
          placeholder="请输入手机号"
          maxlength="11"
        />
      </view>

      <!-- 密码登录模式 -->
      <template v-if="mode === 'login'">
        <view class="input-group">
          <text class="input-label">密码</text>
          <input
            class="input-field"
            v-model="form.password"
            :password="!showPassword"
            placeholder="请输入密码"
          />
          <text class="toggle-pwd" @tap="showPassword = !showPassword">
            {{ showPassword ? '隐藏' : '显示' }}
          </text>
        </view>
      </template>

      <!-- 注册模式：验证码 -->
      <template v-else>
        <view class="input-group">
          <text class="input-label">验证码</text>
          <input
            class="input-field"
            v-model="form.code"
            type="number"
            placeholder="请输入验证码"
            maxlength="6"
          />
          <view
            class="send-code-btn"
            :class="{ disabled: countdown > 0 }"
            @tap="onSendCode"
          >
            <text v-if="countdown === 0">获取验证码</text>
            <text v-else>{{ countdown }}s</text>
          </view>
        </view>
      </template>

      <!-- 提交按钮 -->
      <button
        class="submit-btn"
        :loading="loading"
        :disabled="loading"
        @tap="onSubmit"
      >
        {{ mode === 'login' ? '登录' : '注册' }}
      </button>

      <!-- 微信登录 -->
      <button class="wechat-btn" open-type="chooseAvatar" @chooseavatar="onWechatChoose">
        <text class="wechat-icon">🍊</text>
        <text class="wechat-text">微信一键登录</text>
      </button>

      <!-- 切换登录/注册 -->
      <view class="switch-mode">
        <text class="switch-text">
          {{ mode === 'login' ? '没有账号？' : '已有账号？' }}
        </text>
        <text class="switch-btn" @tap="mode = mode === 'login' ? 'register' : 'login'">
          {{ mode === 'login' ? '立即注册' : '去登录' }}
        </text>
      </view>

      <!-- 忘记密码 -->
      <view v-if="mode === 'login'" class="forgot-pwd">
        <text class="forgot-btn" @tap="onForgotPassword">忘记密码？</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useUserStore } from '../../stores/user'
import { userApi } from '../../api/user'

const userStore = useUserStore()

// 模式：login | register
const mode = ref<'login' | 'register'>('login')
const loading = ref(false)
const showPassword = ref(false)
const countdown = ref(0)

// 表单数据
const form = reactive({
  phone: '',
  password: '',
  code: ''
})

// 关闭页面
function onClose() {
  uni.navigateBack()
}

// 发送验证码
async function onSendCode() {
  if (countdown.value > 0) return
  if (!form.phone || form.phone.length !== 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }

  try {
    await userApi.sendCode(form.phone, 'login')
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    // 开始倒计时
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch {
    // request 已 toast
  }
}

// 提交表单
async function onSubmit() {
  if (!form.phone || form.phone.length !== 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }

  if (mode.value === 'login') {
    // 登录
    if (!form.password) {
      uni.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    await handleLogin()
  } else {
    // 注册
    if (!form.code || form.code.length !== 6) {
      uni.showToast({ title: '请输入6位验证码', icon: 'none' })
      return
    }
    await handleRegister()
  }
}

// 处理登录
async function handleLogin() {
  loading.value = true
  try {
    const phone = String(form.phone).trim()
    const result = await userApi.phoneLogin(phone, form.password)
    userStore.setToken(result.token)
    const userInfo = await userApi.profile()
    userStore.setUserInfo(userInfo)
    if (userInfo.needProfileSetup) {
      uni.redirectTo({ url: '/pages/onboarding/setup' })
    } else {
      uni.showToast({ title: result.message || '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 800)
    }
  } catch {
    // 错误提示由 request 统一 toast，避免重复弹层导致界面异常
  } finally {
    loading.value = false
  }
}

// 处理注册
async function handleRegister() {
  loading.value = true
  try {
    const result = await userApi.bindPhone(String(form.phone).trim(), form.code)
    userStore.setToken(result.token)
    const userInfo = await userApi.profile()
    userStore.setUserInfo(userInfo)
    if (userInfo.needProfileSetup) {
      uni.redirectTo({ url: '/pages/onboarding/setup' })
    } else {
      uni.showToast({ title: '注册成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 800)
    }
  } catch {
    // request 已 toast
  } finally {
    loading.value = false
  }
}

// 微信选择头像（获取 code）
async function onWechatChoose(e: any) {
  // 微信小程序获取 code
  uni.login({
    provider: 'weixin',
    success: async (res) => {
      try {
        const result = await userApi.wechatLogin(res.code)
        userStore.setToken(result.token)
        const userInfo = await userApi.profile()
        userStore.setUserInfo(userInfo)
        if (userInfo.needProfileSetup) {
          uni.redirectTo({ url: '/pages/onboarding/setup' })
        } else {
          uni.showToast({ title: '登录成功', icon: 'success' })
          setTimeout(() => {
            uni.navigateBack()
          }, 800)
        }
      } catch {
        // request 已 toast
      }
    },
    fail: () => {
      uni.showToast({ title: '微信登录失败', icon: 'none' })
    }
  })
}

// 忘记密码
function onForgotPassword() {
  uni.showToast({ title: '请联系客服找回密码', icon: 'none' })
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #e8f4ff 0%, #f5f7fa 100%);
  padding: 0 48rpx;
  padding-top: calc(160rpx + var(--status-bar-height));
}

/* 关闭按钮 */
.close-btn {
  position: fixed;
  top: calc(60rpx + var(--status-bar-height));
  left: 32rpx;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 50%;
  z-index: 100;
}

.icon-close {
  font-size: 32rpx;
  color: #666;
}

/* Logo 区域 */
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  border-radius: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(24, 144, 255, 0.2);
}

.app-name {
  margin-top: 24rpx;
  font-size: 40rpx;
  font-weight: 600;
  color: #1a1a1a;
}

/* 表单区域 */
.form-section {
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.05);
}

.input-group {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  position: relative;
}

.input-group:last-of-type {
  border-bottom: none;
}

.input-label {
  width: 100rpx;
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}

.input-field {
  flex: 1;
  font-size: 30rpx;
  color: #1a1a1a;
  padding: 0 16rpx;
}

/* 密码切换 */
.toggle-pwd {
  font-size: 26rpx;
  color: #1890FF;
  padding: 8rpx 16rpx;
}

/* 发送验证码按钮 */
.send-code-btn {
  background: #e6f4ff;
  color: #1890FF;
  font-size: 24rpx;
  padding: 12rpx 20rpx;
  border-radius: 8rpx;
  white-space: nowrap;
}

.send-code-btn.disabled {
  color: #ccc;
  background: #f5f5f5;
}

/* 提交按钮 */
.submit-btn {
  margin-top: 48rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #1890FF, #52C41A);
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
}

.submit-btn[loading] {
  opacity: 0.7;
}

/* 微信登录 */
.wechat-btn {
  margin-top: 32rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: #f5f5f5;
  color: #333;
  border-radius: 44rpx;
  font-size: 30rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.wechat-icon {
  font-size: 40rpx;
}

.wechat-text {
  font-weight: 500;
}

/* 切换模式 */
.switch-mode {
  margin-top: 40rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
}

.switch-text {
  font-size: 26rpx;
  color: #999;
}

.switch-btn {
  font-size: 26rpx;
  color: #1890FF;
  font-weight: 500;
}

/* 忘记密码 */
.forgot-pwd {
  margin-top: 24rpx;
  display: flex;
  justify-content: center;
}

.forgot-btn {
  font-size: 26rpx;
  color: #999;
}
</style>
