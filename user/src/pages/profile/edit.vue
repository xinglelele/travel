<template>
  <view class="edit-page">
    <view class="avatar-section">
      <image class="avatar" :src="form.avatar || '/static/logo.png'" mode="aspectFill" @tap="chooseAvatar" />
      <text class="avatar-hint">点击更换头像</text>
    </view>

    <view class="form-list">
      <view class="form-item">
        <text class="form-label">昵称</text>
        <input class="form-input" v-model="form.nickname" placeholder="请输入昵称" maxlength="20" />
      </view>
      <view class="form-item">
        <text class="form-label">手机号</text>
        <input class="form-input" v-model="form.phone" placeholder="请输入手机号" type="number" maxlength="11" />
      </view>
      <view class="form-item">
        <text class="form-label">性别</text>
        <view class="gender-group">
          <view class="gender-btn" :class="{ active: form.gender === 1 }" @tap="form.gender = 1">男</view>
          <view class="gender-btn" :class="{ active: form.gender === 2 }" @tap="form.gender = 2">女</view>
          <view class="gender-btn" :class="{ active: form.gender === 0 }" @tap="form.gender = 0">保密</view>
        </view>
      </view>
    </view>

    <button class="save-btn" :loading="saving" @tap="onSave">{{ t('common.save') }}</button>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../../stores/user'
import { userApi } from '../../api/user'
import { uploadFile } from '../../api/upload'
import { toHttpsImage } from '../../api/request'

const { t } = useI18n()
const userStore = useUserStore()
const saving = ref(false)

const form = ref({
  nickname: '',
  avatar: '',
  phone: '',
  gender: 0
})

onMounted(() => {
  if (userStore.userInfo) {
    form.value = {
      nickname: userStore.userInfo.nickname || '',
      avatar: userStore.userInfo.avatar || '',
      phone: userStore.userInfo.tel || '',
      gender: userStore.userInfo.gender ?? 0
    }
  }
})

async function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const temp = res.tempFilePaths[0]
      uni.showLoading({ title: '上传中…', mask: true })
      try {
        const url = await uploadFile(temp)
        form.value.avatar = toHttpsImage(url)
      } catch (e: any) {
        uni.showToast({ title: e.message || '头像上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

async function onSave() {
  if (!form.value.nickname.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  saving.value = true
  try {
    const updated = await userApi.updateProfile(form.value)
    userStore.setUserInfo(updated)
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch {} finally {
    saving.value = false
  }
}
</script>

<style scoped>
.edit-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 60rpx;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0 40rpx;
  background: #fff;
  margin-bottom: 20rpx;
}

.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border: 4rpx solid #e8e8e8;
}

.avatar-hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 16rpx;
}

.form-list {
  background: #fff;
  border-radius: 16rpx;
  margin: 0 24rpx;
  overflow: hidden;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
  gap: 24rpx;
}

.form-item:last-child { border-bottom: none; }

.form-label {
  width: 120rpx;
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
  text-align: right;
}

.gender-group {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
}

.gender-btn {
  padding: 8rpx 24rpx;
  border-radius: 40rpx;
  border: 2rpx solid #e8e8e8;
  font-size: 26rpx;
  color: #666;
}

.gender-btn.active {
  border-color: #1890FF;
  color: #1890FF;
  background: #e6f4ff;
}

.save-btn {
  margin: 48rpx 32rpx 0;
  height: 88rpx;
  line-height: 88rpx;
  background: #1890FF;
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
}
</style>
