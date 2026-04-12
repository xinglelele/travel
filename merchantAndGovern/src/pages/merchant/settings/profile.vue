<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header><span style="font-weight:600">商家信息设置</span></template>
      <el-form ref="formRef" :model="form" label-width="100px" style="max-width:600px">
        <el-form-item label="商户 Logo">
          <el-upload
            action="/api/common/upload"
            :headers="{ Authorization: `Bearer ${merchantStore.token}` }"
            :show-file-list="false"
            :on-success="handleLogoUpload"
          >
            <img v-if="form.logo" :src="form.logo" style="width:80px;height:80px;border-radius:8px;object-fit:cover" />
            <el-button v-else type="primary" plain>上传 Logo</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="商户名称" prop="merchantName">
          <el-input v-model="form.merchantName" placeholder="请输入商户名称" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contactPerson" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="商户简介">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="选填" />
        </el-form-item>
        <el-form-item label="经营类目">
          <el-input :value="categoryLabel" disabled />
        </el-form-item>
        <el-form-item label="注册手机">
          <el-input :value="merchantStore.merchantInfo?.tel" disabled />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSave">保存修改</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:16px">
      <template #header>
        <span style="font-weight:600">快捷入口</span>
      </template>
      <div style="display:flex;gap:16px">
        <el-button @click="$router.push('/merchant/settings/password')">修改密码</el-button>
        <el-button @click="$router.push('/merchant/poi')">景点管理</el-button>
        <el-button @click="$router.push('/merchant/ticket')">票务管理</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useMerchantStore } from '@/stores/merchant'
import { getMerchantProfile, updateMerchantProfile } from '@/api/modules/merchant'

const merchantStore = useMerchantStore()
const formRef = ref()
const form = reactive({ merchantName: '', contactPerson: '', email: '', description: '', logo: '' })
const loading = ref(false)

const categoryMap: Record<string, string> = {
  scenic: '景区景点', museum: '博物馆', restaurant: '餐饮', food: '特色美食',
  cafe: '咖啡茶饮', street: '特色街区', theme_park: '主题乐园', park: '公园绿地', other: '其他'
}
const categoryLabel = computed(() => categoryMap[merchantStore.merchantInfo?.merchantCategory || ''] || '')

onMounted(async () => {
  try {
    const res = await getMerchantProfile()
    form.merchantName = res.data.merchantName || ''
    form.contactPerson = res.data.contactPerson || ''
    form.email = res.data.email || ''
    form.description = res.data.description || ''
    form.logo = res.data.logo || ''
    merchantStore.setMerchantInfo(res.data)
  } catch {}
})

function handleLogoUpload(res: any) {
  if (res.code === 0) form.logo = res.data.url
}

async function handleSave() {
  loading.value = true
  try {
    await updateMerchantProfile(form)
    ElMessage.success('保存成功')
  } finally { loading.value = false }
}
</script>