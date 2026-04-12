<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <el-button text @click="$router.back()">← 返回</el-button>
        <span style="margin-left:8px;font-weight:600">编辑内容</span>
      </template>

      <div v-if="loading && !form.title" v-loading="loading" style="min-height:200px"></div>
      <el-form v-else ref="formRef" :model="form" label-width="100px" :rules="rules">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入内容标题" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="form.summary" type="textarea" :rows="2" placeholder="请输入内容摘要" />
        </el-form-item>
        <el-form-item label="正文内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="6" placeholder="请输入正文内容" />
        </el-form-item>
        <el-form-item label="内容类型" prop="contentType">
          <el-select v-model="form.contentType" placeholder="请选择" style="width:200px">
            <el-option label="攻略" value="guide" />
            <el-option label="资讯" value="news" />
            <el-option label="活动" value="activity" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="form.category" placeholder="请输入分类" style="width:200px" />
        </el-form-item>
        <el-form-item label="封面图片">
          <el-input v-model="form.coverImage" placeholder="请输入封面图片URL" style="width:300px" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="form.tags" placeholder="多个标签用逗号分隔" style="width:300px" />
        </el-form-item>
        <el-form-item label="关联景点">
          <el-input v-model="form.relatedPoiIds" placeholder="请输入关联景点ID，多个用逗号分隔" style="width:300px" />
        </el-form-item>
        <el-form-item label="发布状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="0">草稿</el-radio>
            <el-radio :label="1">已发布</el-radio>
            <el-radio :label="2">已下架</el-radio>
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
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { getContentDetail, updateContent } from '@/api/modules/government'

const router = useRouter()
const route = useRoute()
const formRef = ref<FormInstance>()
const form = reactive<any>({
  title: '',
  summary: '',
  content: '',
  contentType: '',
  category: '',
  coverImage: '',
  tags: '',
  relatedPoiIds: '',
  status: 0
})
const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
  contentType: [{ required: true, message: '请选择内容类型', trigger: 'change' }]
}
const loading = ref(false)

async function fetchDetail() {
  loading.value = true
  try {
    const res = await getContentDetail(Number(route.params.id))
    const d = res.data
    form.title = d.title || ''
    form.summary = d.summary || ''
    form.content = d.content || ''
    form.contentType = d.contentType || ''
    form.category = d.category || ''
    form.coverImage = d.coverImage || ''
    form.tags = Array.isArray(d.tags) ? d.tags.join(',') : ''
    form.relatedPoiIds = Array.isArray(d.relatedPoiIds) ? d.relatedPoiIds.join(',') : ''
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
    const payload: any = { ...form }
    if (form.tags) {
      payload.tags = form.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    }
    if (form.relatedPoiIds) {
      payload.relatedPoiIds = form.relatedPoiIds.split(',').map((id: string) => Number(id.trim())).filter(Boolean)
    }
    await updateContent(Number(route.params.id), payload)
    ElMessage.success('内容已更新')
    router.push('/gov/content')
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchDetail())
</script>
