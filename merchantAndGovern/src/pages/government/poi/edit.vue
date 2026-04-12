<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <el-button text @click="$router.back()">← 返回</el-button>
        <span style="margin-left:8px;font-weight:600">编辑景点</span>
      </template>

      <div v-if="loading && !form.poiName" v-loading="loading" style="min-height:200px"></div>
      <el-form v-else ref="formRef" :model="form" label-width="110px" :rules="rules">
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
        <el-form-item label="状态">
          <el-tag :type="form.status === 1 ? 'success' : form.status === 0 ? 'warning' : 'info'">
            {{ form.status === 1 ? '已上线' : form.status === 0 ? '待审核' : '已下架' }}
          </el-tag>
          <el-button v-if="form.status === 1" type="danger" size="small" style="margin-left:16px" @click="handleOffline">
            下架景点
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">保存修改</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { getPoiDetail, updatePoi, offlinePoi, getDistrictList } from '@/api/modules/government'

const router = useRouter()
const route = useRoute()
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
  needBook: 0,
  status: 0
})
const rules: FormRules = {
  poiName: [{ required: true, message: '请输入景点名称', trigger: 'blur' }]
}
const loading = ref(false)

async function fetchDetail() {
  loading.value = true
  try {
    const res = await getPoiDetail(Number(route.params.id))
    const d = res.data
    form.poiName = d.poiName?.zh || ''
    form.poiNameEn = d.poiName?.en || ''
    form.description = d.description?.zh || ''
    form.tel = d.tel || ''
    form.email = d.email || ''
    form.address = d.address?.zh || ''
    form.districtId = d.districtId ?? null
    form.longitude = d.longitude || 0
    form.latitude = d.latitude || 0
    form.isFree = d.isFree ?? 1
    form.needTickets = d.needTickets ?? 0
    form.needBook = d.needBook ?? 0
    form.status = d.status ?? 0
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    await updatePoi(Number(route.params.id), {
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
    ElMessage.success('景点更新成功')
    router.push('/gov/poi')
  } finally {
    loading.value = false
  }
}

async function handleOffline() {
  await offlinePoi(Number(route.params.id))
  ElMessage.success('景点已下架')
  fetchDetail()
}

onMounted(async () => {
  const dRes = await getDistrictList()
  districts.value = dRes.data || []
  fetchDetail()
})
</script>
