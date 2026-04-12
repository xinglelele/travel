<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <el-button text @click="$router.back()">← 返回</el-button>
        <span style="margin-left:8px;font-weight:600">发布公告</span>
      </template>

      <el-form ref="formRef" :model="form" label-width="100px" :rules="rules">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入公告标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="6" placeholder="请输入公告内容" />
        </el-form-item>
        <el-form-item label="公告类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择" style="width:200px">
            <el-option label="通知" value="notice" />
            <el-option label="资讯" value="info" />
            <el-option label="警告" value="warning" />
          </el-select>
        </el-form-item>
        <el-form-item label="推送范围" prop="targetScope">
          <el-select v-model="form.targetScope" placeholder="请选择" style="width:200px">
            <el-option label="全部用户" value="all" />
            <el-option label="商户" value="merchant" />
            <el-option label="用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="发布状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="0">保存草稿</el-radio>
            <el-radio :label="1">立即发布</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
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
import { createAnnouncement } from '@/api/modules/government'

const router = useRouter()
const formRef = ref<FormInstance>()
const form = reactive<any>({
  title: '',
  content: '',
  type: 'notice',
  targetScope: 'all',
  status: 1
})
const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  targetScope: [{ required: true, message: '请选择范围', trigger: 'change' }]
}
const loading = ref(false)

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    await createAnnouncement(form)
    ElMessage.success(form.status === 1 ? '公告已发布' : '草稿已保存')
    router.push('/gov/announcement')
  } finally {
    loading.value = false
  }
}
</script>
