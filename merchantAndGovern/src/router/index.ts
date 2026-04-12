import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // =============================================
  // 政府端路由
  // =============================================
  {
    path: '/gov',
    component: () => import('@/layouts/GovernmentLayout.vue'),
    redirect: '/gov/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'GovDashboard',
        component: () => import('@/pages/government/dashboard/index.vue'),
        meta: { title: '运营概览', icon: 'DataLine' }
      },
      {
        path: 'poi/audit',
        name: 'GovPoiAudit',
        component: () => import('@/pages/government/poi/audit.vue'),
        meta: { title: 'POI 审核', icon: 'DocumentChecked' }
      },
      {
        path: 'poi/audit/:id',
        name: 'GovPoiAuditDetail',
        component: () => import('@/pages/government/poi/audit-detail.vue'),
        meta: { title: '审核详情', icon: 'View' }
      },
      {
        path: 'poi',
        name: 'GovPoi',
        component: () => import('@/pages/government/poi/index.vue'),
        meta: { title: '景点管理', icon: 'Location' }
      },
      {
        path: 'poi/create',
        name: 'GovPoiCreate',
        component: () => import('@/pages/government/poi/create.vue'),
        meta: { title: '创建景点', icon: 'Plus' }
      },
      {
        path: 'poi/:id/edit',
        name: 'GovPoiEdit',
        component: () => import('@/pages/government/poi/edit.vue'),
        meta: { title: '编辑景点', icon: 'Edit' }
      },
      {
        path: 'merchant',
        name: 'GovMerchant',
        component: () => import('@/pages/government/merchant/index.vue'),
        meta: { title: '商户管理', icon: 'OfficeBuilding' }
      },
      {
        path: 'merchant/:id',
        name: 'GovMerchantDetail',
        component: () => import('@/pages/government/merchant/detail.vue'),
        meta: { title: '商户详情', icon: 'View' }
      },
      {
        path: 'comment/audit',
        name: 'GovCommentAudit',
        component: () => import('@/pages/government/comment/audit.vue'),
        meta: { title: '评论审核', icon: 'ChatDotSquare' }
      },
      {
        path: 'comment/audit/:id',
        name: 'GovCommentDetail',
        component: () => import('@/pages/government/comment/detail.vue'),
        meta: { title: '评论详情', icon: 'View' }
      },
      {
        path: 'report',
        name: 'GovReport',
        component: () => import('@/pages/government/report/index.vue'),
        meta: { title: '举报处理', icon: 'WarnTriangleFilled' }
      },
      {
        path: 'report/:id',
        name: 'GovReportDetail',
        component: () => import('@/pages/government/report/detail.vue'),
        meta: { title: '举报详情', icon: 'View' }
      },
      {
        path: 'content',
        name: 'GovContent',
        component: () => import('@/pages/government/content/index.vue'),
        meta: { title: '内容管理', icon: 'Reading' }
      },
      {
        path: 'content/create',
        name: 'GovContentCreate',
        component: () => import('@/pages/government/content/create.vue'),
        meta: { title: '创建内容', icon: 'Plus' }
      },
      {
        path: 'content/:id/edit',
        name: 'GovContentEdit',
        component: () => import('@/pages/government/content/edit.vue'),
        meta: { title: '编辑内容', icon: 'Edit' }
      },
      {
        path: 'announcement',
        name: 'GovAnnouncement',
        component: () => import('@/pages/government/announcement/index.vue'),
        meta: { title: '系统公告', icon: 'Bell' }
      },
      {
        path: 'announcement/create',
        name: 'GovAnnouncementCreate',
        component: () => import('@/pages/government/announcement/create.vue'),
        meta: { title: '发布公告', icon: 'Plus' }
      },
      {
        path: 'announcement/:id/edit',
        name: 'GovAnnouncementEdit',
        component: () => import('@/pages/government/announcement/edit.vue'),
        meta: { title: '编辑公告', icon: 'Edit' }
      },
      {
        path: 'stats',
        name: 'GovStats',
        component: () => import('@/pages/government/stats/index.vue'),
        meta: { title: '数据分析', icon: 'TrendCharts' }
      },
      {
        path: 'admin',
        name: 'GovAdmin',
        component: () => import('@/pages/government/admin/index.vue'),
        meta: { title: '账号管理', icon: 'User' }
      },
      {
        path: 'admin/create',
        name: 'GovAdminCreate',
        component: () => import('@/pages/government/admin/create.vue'),
        meta: { title: '创建管理员', icon: 'Plus' }
      },
      {
        path: 'settings',
        name: 'GovSettings',
        component: () => import('@/pages/government/settings/profile.vue'),
        meta: { title: '账号设置', icon: 'Setting' }
      },
      {
        path: 'settings/password',
        name: 'GovPassword',
        component: () => import('@/pages/government/settings/password.vue'),
        meta: { title: '修改密码', icon: 'Lock' }
      }
    ]
  },
  // =============================================
  // 商户端路由
  // =============================================
  {
    path: '/merchant',
    component: () => import('@/layouts/MerchantLayout.vue'),
    redirect: '/merchant/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'MerchantDashboard',
        component: () => import('@/pages/merchant/dashboard/index.vue'),
        meta: { title: '运营概览', icon: 'DataLine' }
      },
      {
        path: 'poi',
        name: 'MerchantPoi',
        component: () => import('@/pages/merchant/poi/index.vue'),
        meta: { title: '景点信息', icon: 'Location' }
      },
      {
        path: 'poi/edit',
        name: 'MerchantPoiEdit',
        component: () => import('@/pages/merchant/poi/edit.vue'),
        meta: { title: '编辑景点', icon: 'Edit' }
      },
      {
        path: 'poi/history',
        name: 'MerchantPoiHistory',
        component: () => import('@/pages/merchant/poi/history.vue'),
        meta: { title: '审核历史', icon: 'Clock' }
      },
      {
        path: 'ticket',
        name: 'MerchantTicket',
        component: () => import('@/pages/merchant/ticket/list.vue'),
        meta: { title: '票务管理', icon: 'Tickets' }
      },
      {
        path: 'ticket/edit',
        name: 'MerchantTicketEdit',
        component: () => import('@/pages/merchant/ticket/edit.vue'),
        meta: { title: '编辑票种', icon: 'Edit' }
      },
      {
        path: 'comment',
        name: 'MerchantComment',
        component: () => import('@/pages/merchant/comment/list.vue'),
        meta: { title: '评价管理', icon: 'ChatLineSquare' }
      },
      {
        path: 'comment/:id',
        name: 'MerchantCommentDetail',
        component: () => import('@/pages/merchant/comment/detail.vue'),
        meta: { title: '评价详情', icon: 'View' }
      },
      {
        path: 'message',
        name: 'MerchantMessage',
        component: () => import('@/pages/merchant/message/index.vue'),
        meta: { title: '消息通知', icon: 'Bell' }
      },
      {
        path: 'stats',
        name: 'MerchantStats',
        component: () => import('@/pages/merchant/stats/index.vue'),
        meta: { title: '数据分析', icon: 'TrendCharts' }
      },
      {
        path: 'stats/report',
        name: 'MerchantAiReport',
        component: () => import('@/pages/merchant/stats/ai-report.vue'),
        meta: { title: 'AI 分析报告', icon: 'MagicStick' }
      },
      {
        path: 'settings',
        name: 'MerchantSettings',
        component: () => import('@/pages/merchant/settings/profile.vue'),
        meta: { title: '账号设置', icon: 'Setting' }
      },
      {
        path: 'settings/password',
        name: 'MerchantPassword',
        component: () => import('@/pages/merchant/settings/password.vue'),
        meta: { title: '修改密码', icon: 'Lock' }
      }
    ]
  },
  // 登录页
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/login/index.vue')
  },
  // 注册页
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/pages/login/register.vue')
  },
  // 政府端登录：统一到共享登录页（文档：login/index 角色选择 + 表单）
  {
    path: '/gov/login',
    name: 'GovLogin',
    redirect: { path: '/login', query: { portal: 'gov' } }
  },
  // 默认跳转
  {
    path: '/',
    redirect: '/merchant/dashboard'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/merchant/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 政府端其他页面需要 gov_token
  if (to.path.startsWith('/gov')) {
    const govToken = localStorage.getItem('gov_token')
    if (!govToken) {
      next({ path: '/login', query: { portal: 'gov' } })
      return
    }
    next()
    return
  }

  // 商户端登录/注册页直接放行（/login 含角色选择 + 双端表单）
  if (to.path === '/login' || to.path === '/register') {
    next()
    return
  }

  // 商户端其他页面需要 merchant_token
  const merchantToken = localStorage.getItem('merchant_token')
  if (!merchantToken) {
    next('/login')
    return
  }

  next()
})

export default router
