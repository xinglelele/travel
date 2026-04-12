<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <span class="title">账号设置</span>
      </template>

      <el-form ref="formRef" :model="form" label-width="100px" :rules="rules">
        <el-form-item label="用户名">
          <el-input v-model="form.username" disabled />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入真实姓名" style="width:240px" />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="form.department" placeholder="请输入部门" style="width:240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { useGovernmentStore } from '@/stores/government'
import { updateGovProfile } from '@/api/modules/government'

const govStore = useGovernmentStore()
const formRef = ref<FormInstance>()
const form = reactive<any>({
  username: '',
  realName: '',
  department: ''
})
const rules: FormRules = {
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }]
}
const loading = ref(false)

onMounted(() => {
  if (govStore.govInfo) {
    form.username = govStore.govInfo.username || ''
    form.realName = govStore.govInfo.realName || ''
    form.department = govStore.govInfo.department || ''
  }
})

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    await updateGovProfile({ realName: form.realName, department: form.department })
    ElMessage.success('个人信息已更新')
    govStore.setGovInfo({ ...govStore.govInfo!, realName: form.realName, department: form.department })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.title { font-size: 15px; font-weight: 600; }
</style>
