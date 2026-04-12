<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header><el-button text @click="$router.back()">← 返回</el-button></template>
      <div v-if="comment.id">
        <div class="detail-header">
          <el-avatar :size="48">{{ comment.userNickname?.[0] }}</el-avatar>
          <div style="margin-left:12px">
            <div style="font-size:15px;font-weight:600">{{ comment.userNickname }}</div>
            <el-rate v-model="comment.rating" disabled style="margin-top:4px" />
            <div style="color:#999;font-size:12px;margin-top:4px">{{ formatDate(comment.createdAt) }}</div>
          </div>
        </div>
        <div class="detail-content">{{ comment.content }}</div>
        <div v-if="comment.images?.length" style="margin-top:16px">
          <el-image v-for="(img,i) in comment.images" :key="i" :src="img" style="width:120px;height:120px;border-radius:8px;margin-right:12px;object-fit:cover" :preview-src-list="comment.images" />
        </div>

        <el-divider />

        <div class="reply-area">
          <h4>商家回复</h4>
          <div v-if="comment.merchantReply" class="existing-reply">
            <div class="reply-text">{{ comment.merchantReply }}</div>
            <div style="color:#999;font-size:12px;margin-top:6px">{{ formatDate(comment.replyTime) }}</div>
            <div style="margin-top:8px">
              <el-button type="primary" text size="small" @click="editing=true;replyText=comment.merchantReply">编辑</el-button>
              <el-button type="danger" text size="small" @click="handleDeleteReply">删除</el-button>
            </div>
          </div>
          <div v-else>
            <p style="color:#999;font-size:13px">暂无回复</p>
          </div>
          <div v-if="editing || !comment.merchantReply" style="margin-top:16px">
            <el-input v-model="replyText" type="textarea" :rows="3" placeholder="请输入回复内容" />
            <div style="margin-top:10px">
              <el-button type="primary" :loading="loading" @click="handleSubmitReply">提交回复</el-button>
              <el-button v-if="editing" @click="editing=false">取消</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCommentList, replyComment, editReply, deleteReply } from '@/api/modules/comment'

const route = useRoute()
const comment = ref<any>({})
const replyText = ref('')
const editing = ref(false)
const loading = ref(false)

onMounted(async () => {
  const res = await getCommentList({ pageSize: 100 })
  comment.value = res.data.list.find((c: any) => c.id === Number(route.params.id)) || {}
  if (comment.value?.merchantReply) replyText.value = comment.value.merchantReply
})

async function handleSubmitReply() {
  if (!replyText.value.trim()) { ElMessage.warning('请输入回复'); return }
  loading.value = true
  try {
    if (comment.value.merchantReply) {
      await editReply(comment.value.id, replyText.value)
    } else {
      await replyComment(comment.value.id, replyText.value)
    }
    ElMessage.success('操作成功')
    editing.value = false
    const res = await getCommentList({ pageSize: 100 })
    comment.value = res.data.list.find((c: any) => c.id === Number(route.params.id)) || {}
  } finally { loading.value = false }
}

async function handleDeleteReply() {
  await deleteReply(comment.value.id)
  ElMessage.success('已删除回复')
  const res = await getCommentList({ pageSize: 100 })
  comment.value = res.data.list.find((c: any) => c.id === Number(route.params.id)) || {}
}

function formatDate(d: string) { return new Date(d).toLocaleString('zh-CN') }
</script>

<style scoped>
.detail-header { display:flex; align-items:center; margin-bottom:16px }
.detail-content { font-size:14px; line-height:1.8; color:#333; margin-top:12px }
.reply-area h4 { font-size:14px; font-weight:600; color:#333; margin-bottom:12px }
.reply-text { background:#f5f6fa; padding:12px; border-radius:8px; color:#444; line-height:1.6 }
</style>