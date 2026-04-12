<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <el-button text @click="$router.back()">← 返回</el-button>
        <span style="margin-left:8px;font-weight:600">编辑景点信息</span>
      </template>

      <el-form ref="formRef" :model="form" label-width="100px" :rules="rules">
        <el-form-item label="景点名称" prop="poiName">
          <el-input v-model="form.poiName" placeholder="请输入景点名称（中文）" />
        </el-form-item>
        <el-form-item label="景点描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入景点描述" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.tel" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="行政区">
          <el-select v-model="form.districtId" placeholder="请选择行政区" clearable style="width:100%">
            <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="经度/纬度">
          <el-input-number v-model="form.longitude" :precision="6" style="width:160px" /> /
          <el-input-number v-model="form.latitude" :precision="6" style="width:160px" />
        </el-form-item>
        <el-form-item label="是否免费">
          <el-radio-group v-model="form.isFree">
            <el-radio :label="1">免费</el-radio>
            <el-radio :label="0">收费</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="需要门票">
          <el-switch v-model="form.needTickets" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="需要预约">
          <el-switch v-model="form.needBook" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="官方链接">
          <el-input v-model="form.officialUrl" placeholder="选填" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">提交审核</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { getMerchantPoi, updatePoi, getDistrictList } from '@/api/modules/poi'

const router = useRouter()
const formRef = ref<FormInstance>()
const districts = ref<any[]>([])
const form = reactive<any>({
  poiName: '', description: '', tel: '', email: '', address: '',
  districtId: null, longitude: 0, latitude: 0,
  isFree: 0, needTickets: 0, needBook: 0, officialUrl: ''
})
const rules: FormRules = {
  poiName: [{ required: true, message: '请输入景点名称', trigger: 'blur' }]
}
const loading = ref(false)

async function fetchDetail() {
  try {
    const res = await getMerchantPoi()
    if (res.data.id) {
      form.poiName = res.data.poiName?.zh || ''
      form.description = res.data.description?.zh || ''
      form.tel = res.data.tel || ''
      form.email = res.data.email || ''
      form.address = res.data.address?.zh || ''
      form.districtId = res.data.district?.id ?? null
      form.longitude = res.data.longitude || 0
      form.latitude = res.data.latitude || 0
      form.isFree = res.data.isFree || 0
      form.needTickets = res.data.needTickets || 0
      form.needBook = res.data.needBook || 0
      form.officialUrl = res.data.officialUrl || ''
    }
  } catch {}
}

onMounted(async () => {
  const dRes = await getDistrictList()
  districts.value = dRes.data || []
  fetchDetail()
})

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    await updatePoi({
      poiName: { zh: form.poiName, en: form.poiName },
      description: { zh: form.description, en: form.description },
      address: { zh: form.address, en: form.address },
      tel: form.tel,
      email: form.email,
      districtId: form.districtId,
      longitude: form.longitude,
      latitude: form.latitude,
      isFree: form.isFree,
      needTickets: form.needTickets,
      needBook: form.needBook,
      officialUrl: form.officialUrl
    })
    ElMessage.success('景点信息已提交，等待政府端审核')
    router.push('/merchant/poi')
  } finally {
    loading.value = false
  }
}
</script>
