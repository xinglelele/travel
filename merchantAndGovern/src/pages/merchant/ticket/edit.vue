<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <el-button text @click="$router.back()">← 返回</el-button>
        <span style="margin-left:8px;font-weight:600">{{ isEdit ? '编辑票种' : '新增票种' }}</span>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" style="max-width:600px">
        <el-form-item label="票种名称" prop="ticketName">
          <el-input v-model="form.ticketName" placeholder="请输入票种名称" />
        </el-form-item>
        <el-form-item label="票种描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="选填" />
        </el-form-item>
        <el-form-item label="价格（元）" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="2" style="width:200px" />
        </el-form-item>
        <el-form-item label="库存数量">
          <el-input-number v-model="form.stock" :min="0" style="width:200px" />
          <span style="margin-left:8px;color:#999;font-size:12px">设为0表示不限量</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">在售</el-radio>
            <el-radio :label="0">停售</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">{{ isEdit ? '保存' : '创建' }}</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { createTicket, updateTicket } from '@/api/modules/ticket'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.query.id)
const formRef = ref<FormInstance>()
const form = reactive({ ticketName: '', description: '', price: 0, stock: 0, status: 1 })
const rules: FormRules = {
  ticketName: [{ required: true, message: '请输入票种名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }]
}
const loading = ref(false)

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    if (isEdit.value) {
      await updateTicket(Number(route.query.id), form)
    } else {
      await createTicket(form)
    }
    ElMessage.success('操作成功')
    router.push('/merchant/ticket')
  } finally { loading.value = false }
}

onMounted(async () => {
  if (isEdit.value && route.query.id) {
    const { getTicketList } = await import('@/api/modules/ticket')
    const res = await getTicketList({ pageSize: 100 })
    const ticket = res.data.list.find((t: any) => t.id === Number(route.query.id))
    if (ticket) {
      form.ticketName = ticket.ticketName?.zh || ticket.ticketName || ''
      form.description = ticket.description?.zh || ''
      form.price = ticket.price
      form.stock = ticket.stock
      form.status = ticket.status
    }
  }
})
</script>