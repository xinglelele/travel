<template>
  <div class="register-page">
    <div class="register-card">
      <div class="register-card-scroll">
        <div class="register-header">
          <div class="logo-icon">商</div>
          <h2>商户入驻</h2>
          <p>智慧旅游平台 · 商户端</p>
        </div>

        <el-form ref="formRef" class="register-form" :model="form" :rules="rules" label-width="168px" @submit.prevent="handleRegister">
        <el-divider content-position="left">账号与资质</el-divider>
        <el-form-item label="商户名称" prop="merchantName">
          <el-input v-model="form.merchantName" placeholder="与对外展示的景点名称一致" />
        </el-form-item>
        <el-form-item label="景点名称（英文）" prop="poiNameEn">
          <div class="input-with-btn">
            <el-input v-model="form.poiNameEn" placeholder="必填；景点对外展示的英文名称" />
            <el-button
              type="primary"
              plain
              size="small"
              class="translate-btn"
              :loading="translatingName"
              :disabled="!form.merchantName.trim()"
              @click="translateField('name')"
            >
              一键翻译
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="手机号" prop="tel">
          <el-input v-model="form.tel" placeholder="登录账号" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="6位以上密码" />
        </el-form-item>
        <el-form-item label="经营类目" prop="merchantCategory">
          <el-select v-model="form.merchantCategory" placeholder="请选择经营类目" style="width: 100%">
            <el-option label="景区景点" value="scenic" />
            <el-option label="博物馆" value="museum" />
            <el-option label="餐饮" value="restaurant" />
            <el-option label="特色美食" value="food" />
            <el-option label="咖啡茶饮" value="cafe" />
            <el-option label="特色街区" value="street" />
            <el-option label="主题乐园" value="theme_park" />
            <el-option label="公园绿地" value="park" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="营业执照" prop="businessLicense">
          <el-input v-model="form.businessLicense" placeholder="选填，可填图片 URL（登录后可在资料中上传）" />
        </el-form-item>
        <el-form-item label="联系人" prop="contactPerson">
          <el-input v-model="form.contactPerson" placeholder="选填" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="选填" />
        </el-form-item>

        <el-divider content-position="left">景点（POI）信息</el-divider>
        <p class="section-hint">注册时将同步创建待审核景点，信息需与政府端审核要求一致（与「编辑景点」字段相同）。</p>
        <el-form-item label="景点描述（中文）" prop="poiDescriptionZh">
          <el-input
            v-model="form.poiDescriptionZh"
            type="textarea"
            :rows="3"
            placeholder="请介绍景点特色、亮点等（至少5个字）"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="景点描述（英文）" prop="poiDescriptionEn">
          <div class="input-with-btn">
            <el-input
              v-model="form.poiDescriptionEn"
              type="textarea"
              :rows="3"
              placeholder="必填；可点击右侧按钮翻译后修改"
              maxlength="2000"
              show-word-limit
            />
            <el-button
              type="primary"
              plain
              size="small"
              class="translate-btn"
              :loading="translatingDesc"
              :disabled="!form.poiDescriptionZh.trim()"
              @click="translateField('desc')"
            >
              一键翻译
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="详细地址（中文）" prop="addressZh">
          <el-input v-model="form.addressZh" placeholder="游客到达/导航用地址" />
        </el-form-item>
        <el-form-item label="详细地址（英文）" prop="addressEn">
          <div class="input-with-btn">
            <el-input v-model="form.addressEn" placeholder="必填；可点击右侧按钮翻译后修改" />
            <el-button
              type="primary"
              plain
              size="small"
              class="translate-btn"
              :loading="translatingAddr"
              :disabled="!form.addressZh.trim()"
              @click="translateField('addr')"
            >
              一键翻译
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="行政区" prop="districtId">
          <el-select v-model="form.districtId" placeholder="请选择行政区" filterable style="width: 100%" :loading="districtLoading">
            <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="经度 / 纬度" prop="longitude">
          <div class="lnglat-row">
            <el-input-number v-model="form.longitude" :precision="6" :step="0.000001" controls-position="right" class="lnglat-input" />
            <span class="lnglat-sep">/</span>
            <el-input-number v-model="form.latitude" :precision="6" :step="0.000001" controls-position="right" class="lnglat-input" />
            <el-button
              type="primary"
              plain
              size="small"
              class="locate-btn"
              :loading="locating"
              :disabled="!form.addressZh?.trim()"
              title="根据上方中文地址自动获取坐标"
              @click="handleGetLngLat"
            >
              获取坐标
            </el-button>
          </div>
          <p class="field-tip">
            请填写坐标（GCJ-02，勿填 0）；可先填地址再点「获取坐标」自动填充，或手动微调。
          </p>
        </el-form-item>
        <el-form-item class="register-attr-row" label="是否免费" prop="isFree">
          <div class="inline-field-wrap">
            <el-radio-group v-model="form.isFree" class="register-radio-group">
              <el-radio :value="1">免费</el-radio>
              <el-radio :value="0">收费</el-radio>
            </el-radio-group>
          </div>
        </el-form-item>
        <el-form-item class="register-attr-row" label="需要门票" prop="needTickets">
          <div class="inline-field-wrap">
            <el-switch
              v-model="form.needTickets"
              :disabled="form.isFree === 1"
              :active-value="1"
              :inactive-value="0"
            />
            <span v-if="form.isFree === 1" class="inline-field-muted">免费开放，无需门票</span>
          </div>
        </el-form-item>
        <el-form-item class="register-attr-row" label="需要预约" prop="needBook">
          <div class="inline-field-wrap">
            <el-switch v-model="form.needBook" :active-value="1" :inactive-value="0" />
          </div>
        </el-form-item>
        <el-form-item label="官方链接" prop="officialUrl">
          <el-input v-model="form.officialUrl" placeholder="选填，官网或购票页等" />
        </el-form-item>
        <el-form-item label="展示图片" prop="photoUrls">
          <div class="photo-field">
            <div class="photo-field-toolbar">
              <el-upload
                :show-file-list="false"
                :http-request="handlePhotoUpload"
                :before-upload="beforePhotoUpload"
                accept="image/*"
              >
                <el-button type="primary" plain size="small">本地上传图片</el-button>
              </el-upload>
              <span class="photo-field-hint">首张为封面；登录后可在编辑页拖拽排序。链接请每行一条（勿用英文逗号分隔多图）。</span>
            </div>
            <div v-if="photoUrlList.length" class="photo-preview-grid">
              <div v-for="(u, i) in photoUrlList" :key="`${i}-${u}`" class="photo-preview-item">
                <el-image :src="u" fit="cover" class="photo-preview-img" lazy>
                  <template #error>
                    <div class="photo-preview-fail">无法显示</div>
                  </template>
                </el-image>
                <el-button type="danger" link size="small" class="photo-preview-remove" @click="removePhotoAt(i)">
                  移除
                </el-button>
              </div>
            </div>
            <el-input
              v-model="form.photoUrls"
              type="textarea"
              :rows="3"
              placeholder="选填：粘贴图片地址时每行一条；也可只用上方本地上传"
            />
          </div>
        </el-form-item>

        <el-button type="primary" size="large" class="register-btn" :loading="loading" @click="handleRegister">
          提交注册
        </el-button>
        <div class="login-link">
          已有账号？<el-link type="primary" :underline="false" @click="$router.push('/login')">立即登录</el-link>
        </div>
      </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import type { UploadRequestOptions } from 'element-plus'
import { merchantRegister, translateZhToEn, uploadRegisterPhoto, geocodeByAddress } from '@/api/modules/merchant'
import { getDistrictList } from '@/api/modules/poi'

const router = useRouter()
const formRef = ref<FormInstance>()
const districts = ref<{ id: number; name: string }[]>([])
const districtLoading = ref(false)
const translatingDesc = ref(false)
const translatingAddr = ref(false)
const translatingName = ref(false)
const locating = ref(false)

const form = reactive({
  merchantName: '',
  tel: '',
  password: '',
  merchantCategory: '',
  businessLicense: '',
  contactPerson: '',
  email: '',
  poiNameEn: '',
  poiDescriptionZh: '',
  poiDescriptionEn: '',
  addressZh: '',
  addressEn: '',
  districtId: undefined as number | undefined,
  longitude: undefined as number | undefined,
  latitude: undefined as number | undefined,
  isFree: 0,
  needTickets: 0,
  needBook: 0,
  officialUrl: '',
  photoUrls: ''
})

// 免费开放与「需要门票」互斥：免费时视为无需购票
watch(
  () => form.isFree,
  (v) => {
    if (v === 1) form.needTickets = 0
  }
)

/** 根据中文地址自动获取经纬度（GCJ-02，走后端高德 Web 服务，避免浏览器插件超时） */
async function handleGetLngLat() {
  const addr = form.addressZh?.trim()
  if (!addr) {
    ElMessage.warning('请先填写详细地址（中文）')
    return
  }
  locating.value = true
  try {
    const res = (await geocodeByAddress(addr)) as { data?: { lng: number; lat: number } }
    const pt = res.data
    if (pt != null && Number.isFinite(pt.lng) && Number.isFinite(pt.lat)) {
      form.longitude = pt.lng
      form.latitude = pt.lat
      ElMessage.success('坐标已自动填充，可手动微调')
    }
  } catch {
    // 错误提示由 request 拦截器统一弹出
  } finally {
    locating.value = false
  }
}

function validateLngLat(_rule: unknown, _val: unknown, callback: (e?: Error) => void) {
  const lng = form.longitude
  const lat = form.latitude
  if (lng === undefined || lat === undefined || lng === null || lat === null) {
    callback(new Error('请填写经度和纬度'))
    return
  }
  if (!Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) {
    callback(new Error('经纬度必须为数字'))
    return
  }
  if (Math.abs(Number(lng)) < 1e-6 && Math.abs(Number(lat)) < 1e-6) {
    callback(new Error('经纬度不能均为 0'))
    return
  }
  callback()
}

const rules: FormRules = {
  merchantName: [{ required: true, message: '请输入商户名称', trigger: 'blur' }],
  poiNameEn: [{ required: true, message: '请填写景点英文名称（至少2个字符）', trigger: 'blur' }],
  tel: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  merchantCategory: [{ required: true, message: '请选择经营类目', trigger: 'change' }],
  poiDescriptionZh: [
    { required: true, message: '请填写景点描述（中文，至少5个字）', trigger: 'blur' },
    { min: 5, message: '景点描述至少5个字', trigger: 'blur' }
  ],
  addressZh: [{ required: true, message: '请填写详细地址（中文）', trigger: 'blur' }],
  poiDescriptionEn: [{ required: true, message: '请填写景点描述（英文，至少2个字符）', trigger: 'blur' }],
  addressEn: [{ required: true, message: '请填写详细地址（英文，至少2个字符）', trigger: 'blur' }],
  districtId: [{ required: true, message: '请选择行政区', trigger: 'change' }],
  longitude: [{ validator: validateLngLat, trigger: 'blur' }]
}
const loading = ref(false)

const MAX_REGISTER_PHOTOS = 12

function parsePhotoLines(text: string): string[] {
  return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
}

const photoUrlList = computed(() => parsePhotoLines(form.photoUrls))

function beforePhotoUpload() {
  if (parsePhotoLines(form.photoUrls).length >= MAX_REGISTER_PHOTOS) {
    ElMessage.warning(`最多添加 ${MAX_REGISTER_PHOTOS} 张展示图`)
    return false
  }
  return true
}

async function handlePhotoUpload(opt: UploadRequestOptions) {
  const fd = new FormData()
  fd.append('file', opt.file as File)
  try {
    const res = (await uploadRegisterPhoto(fd)) as { data?: { url?: string } }
    const url = res?.data?.url
    if (!url) {
      ElMessage.error('上传成功但未返回图片地址')
      opt.onError({ name: 'Error', message: 'no url', status: 500, method: 'POST', url: '' })
      return
    }
    const list = parsePhotoLines(form.photoUrls)
    if (!list.includes(url)) list.push(url)
    form.photoUrls = list.join('\n')
    ElMessage.success('已添加图片')
    opt.onSuccess(res as any)
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e))
    opt.onError({ name: err.name, message: err.message, status: 500, method: 'POST', url: '' })
  }
}

function removePhotoAt(index: number) {
  const list = [...photoUrlList.value]
  list.splice(index, 1)
  form.photoUrls = list.join('\n')
}

onMounted(async () => {
  districtLoading.value = true
  try {
    const res = await getDistrictList()
    districts.value = res.data || []
  } catch {
    districts.value = []
  } finally {
    districtLoading.value = false
  }
})

async function translateField(field: 'desc' | 'addr' | 'name') {
  let textZh = ''
  if (field === 'desc') textZh = form.poiDescriptionZh.trim()
  else if (field === 'addr') textZh = form.addressZh.trim()
  else textZh = form.merchantName.trim()
  if (!textZh) return

  if (field === 'desc') translatingDesc.value = true
  else if (field === 'addr') translatingAddr.value = true
  else translatingName.value = true

  try {
    const res = await translateZhToEn({ text: textZh })
    const translated = res.data?.text ?? res.data?.translation ?? ''
    if (!translated) {
      ElMessage.warning('翻译接口未返回结果，请手动填写')
      return
    }
    if (field === 'desc') {
      form.poiDescriptionEn = translated
      ElMessage.success('描述已翻译，可手动修改')
    } else if (field === 'addr') {
      form.addressEn = translated
      ElMessage.success('地址已翻译，可手动修改')
    } else {
      form.poiNameEn = translated
      ElMessage.success('英文名称已翻译，可手动修改')
    }
  } catch {
    ElMessage.error('翻译失败，请检查网络或手动填写')
  } finally {
    if (field === 'desc') translatingDesc.value = false
    else if (field === 'addr') translatingAddr.value = false
    else translatingName.value = false
  }
}

async function handleRegister() {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    const photoLines = parsePhotoLines(form.photoUrls)
    const photos = photoLines.length ? photoLines : undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (merchantRegister as any)({
      merchantName: form.merchantName,
      tel: form.tel,
      password: form.password,
      merchantCategory: form.merchantCategory,
      contactPerson: form.contactPerson || undefined,
      email: form.email || undefined,
      businessLicense: form.businessLicense || undefined,
      poiNameEn: form.poiNameEn.trim(),
      poiDescriptionZh: (form.poiDescriptionZh as string).trim(),
      poiDescriptionEn: (form.poiDescriptionEn as string).trim(),
      addressZh: (form.addressZh as string).trim(),
      addressEn: (form.addressEn as string).trim(),
      districtId: form.districtId!,
      longitude: Number(form.longitude),
      latitude: Number(form.latitude),
      isFree: form.isFree,
      needTickets: form.needTickets,
      needBook: form.needBook,
      officialUrl: form.officialUrl.trim() || undefined,
      photos
    })
    ElMessage.success('注册成功，请等待政府端审核')
    router.push('/login')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 16px 48px;
  box-sizing: border-box;
}

.register-form :deep(.el-form-item__label) {
  line-height: 1.5;
  align-items: flex-start;
  /* 避免「（英文）」被拆成上一行「英」、下一行「文）」 */
  white-space: nowrap;
}

/* 单选 / 开关行：与输入框行左缘对齐，控件垂直居中 */
.register-form :deep(.register-attr-row .el-form-item__content) {
  align-items: center;
  min-height: 32px;
}

.inline-field-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
  width: 100%;
}

.inline-field-muted {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.register-form :deep(.register-radio-group) {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}

@media (max-width: 520px) {
  .register-form :deep(.el-form-item__label) {
    white-space: normal;
    word-break: keep-all;
  }
}

/* 外层白框：不滚动，避免滚动条贴在最外缘显得「在框外」 */
.register-card {
  width: 100%;
  max-width: 640px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  max-height: calc(100vh - 64px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 内层滚动：滚动条落在白底内容区内，与圆角对齐 */
.register-card-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 32px 28px 40px 36px;
  box-sizing: border-box;
  scrollbar-gutter: stable;
}

.register-card-scroll::-webkit-scrollbar {
  width: 8px;
}

.register-card-scroll::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 4px;
  margin: 8px 0;
}

.register-card-scroll::-webkit-scrollbar-thumb {
  background: #c8c8c8;
  border-radius: 4px;
}

.register-card-scroll::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.register-header {
  text-align: center;
  margin-bottom: 20px;
}

.logo-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.register-header h2 {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 6px;
}

.register-header p {
  font-size: 13px;
  color: #999;
}

.section-hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin: -8px 0 16px;
}

.input-with-btn {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.input-with-btn :deep(.el-textarea),
.input-with-btn :deep(.el-input) {
  flex: 1;
}

.translate-btn {
  flex-shrink: 0;
  margin-top: 2px;
}

.lnglat-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.lnglat-input {
  width: 160px;
}

.locate-btn {
  flex-shrink: 0;
  margin-left: 4px;
}

.lnglat-sep {
  color: #909399;
}

.field-tip {
  font-size: 12px;
  color: #909399;
  margin: 6px 0 0;
  line-height: 1.4;
}

.register-btn {
  width: 100%;
  margin-top: 16px;
  height: 44px;
  font-size: 15px;
  border-radius: 8px;
}

.login-link {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: #999;
}

.photo-field {
  width: 100%;
}

.photo-field-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.photo-field-hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  flex: 1;
  min-width: 200px;
}

.photo-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.photo-preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.photo-preview-img {
  width: 88px;
  height: 88px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  overflow: hidden;
  background: #f5f7fa;
}

.photo-preview-fail {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 11px;
  color: #909399;
  padding: 4px;
  text-align: center;
}

.photo-preview-remove {
  padding: 0;
}
</style>
