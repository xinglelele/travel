<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <el-button text @click="$router.back()">← 返回</el-button>
        <span style="margin-left:8px;font-weight:600">创建管理员</span>
      </template>

      <el-form ref="formRef" :model="form" label-width="100px" :rules="rules">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" style="width:240px" />
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input v-model="form.realName" placeholder="请输入真实姓名" style="width:240px" />
        </el-form-item>
        <el-form-item label="联系电话" prop="tel">
          <el-input v-model="form.tel" placeholder="请输入联系电话" style="width:240px" />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="form.department" placeholder="请输入部门" style="width:240px" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色" style="width:240px">
            <el-option label="超管" :value="0" />
            <el-option label="管理员" :value="1" />
            <el-option label="审核员" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码（至少6位）" style="width:240px" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">创建</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { createAdmin } from '@/api/modules/government'

const router = useRouter()
const formRef = ref<FormInstance>()
const form = reactive<any>({
  username: '',
  realName: '',
  tel: '',
  department: '',
  role: 2,
  password: ''
})
const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  tel: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
}
const loading = ref(false)

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    await createAdmin(form)
    ElMessage.success('管理员创建成功')
    router.push('/gov/admin')
  } finally {
    loading.value = false
  }
}
</script>
