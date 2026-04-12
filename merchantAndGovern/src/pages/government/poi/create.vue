<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <el-button text @click="$router.back()">← 返回</el-button>
        <span style="margin-left:8px;font-weight:600">创建景点</span>
      </template>

      <el-form ref="formRef" :model="form" label-width="110px" :rules="rules">
        <el-form-item label="景点名称(中文)" prop="poiName">
          <el-input v-model="form.poiName" placeholder="请输入景点名称（中文）" />
        </el-form-item>
        <el-form-item label="景点名称(英文)">
          <el-input v-model="form.poiNameEn" placeholder="请输入景点名称（英文）" />
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
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">创建景点</el-button>
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
import { createPoi, getDistrictList } from '@/api/modules/government'

const router = useRouter()
const formRef = ref<FormInstance>()
const districts = ref<any[]>([])
const form = reactive<any>({
  poiName: '',
  poiNameEn: '',
  description: '',
  tel: '',
  email: '',
  address: '',
  districtId: null,
  longitude: 0,
  latitude: 0,
  isFree: 1,
  needTickets: 0,
  needBook: 0
})
const rules: FormRules = {
  poiName: [{ required: true, message: '请输入景点名称', trigger: 'blur' }]
}
const loading = ref(false)

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    await createPoi({
      poiName: { zh: form.poiName, en: form.poiNameEn },
      description: { zh: form.description, en: form.description },
      address: { zh: form.address, en: form.address },
      tel: form.tel,
      email: form.email,
      districtId: form.districtId,
      longitude: form.longitude,
      latitude: form.latitude,
      isFree: form.isFree,
      needTickets: form.needTickets,
      needBook: form.needBook
    })
    ElMessage.success('景点创建成功')
    router.push('/gov/poi')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const dRes = await getDistrictList()
  districts.value = dRes.data || []
})
</script>
