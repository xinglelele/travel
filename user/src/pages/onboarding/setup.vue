<template>
  <view class="setup-page">
    <view class="header">
      <text class="title">完善资料</text>
      <text class="subtitle">请设置昵称、头像与性别，以便继续使用</text>
    </view>

    <view class="card">
      <view class="avatar-row" @tap="chooseAvatar">
        <image class="avatar" :src="form.avatar || '/static/logo.png'" mode="aspectFill" />
        <text class="avatar-hint">点击设置头像</text>
      </view>

      <view class="field">
        <text class="label">昵称</text>
        <input
          v-model="form.nickname"
          class="input"
          placeholder="请输入昵称"
          maxlength="20"
        />
      </view>

      <view class="field">
        <text class="label">性别</text>
        <view class="gender-row">
          <view class="g" :class="{ on: form.gender === 1 }" @tap="form.gender = 1">男</view>
          <view class="g" :class="{ on: form.gender === 2 }" @tap="form.gender = 2">女</view>
          <view class="g" :class="{ on: form.gender === 0 }" @tap="form.gender = 0">保密</view>
        </view>
      </view>

      <button class="submit" :loading="saving" :disabled="saving" @tap="onSubmit">完成并进入</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { userApi } from '../../api/user'

const userStore = useUserStore()
const saving = ref(false)

const form = ref({
  nickname: '',
  avatar: '',
  gender: 0 as number
})

onMounted(() => {
  const u = userStore.userInfo
  if (u) {
    form.value = {
      nickname: u.nickname || '',
      avatar: u.avatar || '',
      gender: u.gender ?? 0
    }
  }
})

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      form.value.avatar = res.tempFilePaths[0]
    }
  })
}

async function onSubmit() {
  const nick = form.value.nickname.trim()
  if (!nick) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  if (!form.value.avatar) {
    uni.showToast({ title: '请设置头像', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await userApi.updateProfile({
      nickname: nick,
      avatar: form.value.avatar,
      gender: form.value.gender
    })
    const full = await userApi.profile()
    userStore.setUserInfo(full)
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/profile/index' })
    }, 500)
  } catch {
    // request 已 toast
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.setup-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #e8f4ff 0%, #f5f7fa 100%);
  padding: calc(48rpx + env(safe-area-inset-top)) 48rpx 80rpx;
  box-sizing: border-box;
}

.header {
  margin-bottom: 40rpx;
}

.title {
  display: block;
  font-size: 44rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.subtitle {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #888;
  line-height: 1.5;
}

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 36rpx 48rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.05);
}

.avatar-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
}

.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border: 4rpx solid #e8e8e8;
}

.avatar-hint {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #1890ff;
}

.field {
  margin-bottom: 36rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
}

.input {
  height: 88rpx;
  padding: 0 24rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  font-size: 30rpx;
}

.gender-row {
  display: flex;
  gap: 24rpx;
}

.g {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 12rpx;
  background: #f7f8fa;
  font-size: 28rpx;
  color: #666;
}

.g.on {
  background: #e6f4ff;
  color: #1890ff;
  font-weight: 500;
}

.submit {
  margin-top: 24rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #1890ff, #52c41a);
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
  border: none;
}
</style>
