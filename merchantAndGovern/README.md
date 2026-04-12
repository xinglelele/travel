# 商户端 + 政府端（merchantAndGovern）

> 智慧旅游平台商户运营管理后台，基于 Vue3 + Element Plus + TypeScript + ECharts。

## 技术栈

- **前端框架**: Vue 3 + TypeScript + Vite
- **UI 组件库**: Element Plus
- **图表**: ECharts 5
- **状态管理**: Pinia
- **HTTP 客户端**: Axios
- **路由**: Vue Router 4

## 项目结构

```
merchantAndGovern/
├── src/
│   ├── api/                   # API 请求封装
│   │   ├── request.ts        # Axios 实例（统一拦截器）
│   │   └── modules/          # 按模块拆分的 API
│   │       ├── merchant.ts    # 认证相关
│   │       ├── poi.ts         # 景点管理
│   │       ├── ticket.ts      # 票务管理
│   │       ├── comment.ts     # 评价管理
│   │       └── stats.ts       # 数据统计
│   ├── layouts/
│   │   └── MerchantLayout.vue # 商户侧主布局
│   ├── pages/
│   │   ├── login/             # 登录/注册页
│   │   └── merchant/          # 商户端页面
│   │       ├── dashboard/    # 运营概览
│   │       ├── poi/           # 景点信息管理
│   │       ├── ticket/        # 票务管理
│   │       ├── comment/       # 评价管理
│   │       ├── message/       # 消息通知
│   │       ├── stats/         # 数据分析 + AI 报告
│   │       └── settings/     # 账号设置
│   ├── stores/                # Pinia 状态管理
│   ├── router/                # 路由配置
│   ├── config/                # 环境变量
│   └── styles/                # 全局样式
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 环境配置

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3000
```

## 功能模块

| 模块 | 说明 |
| --- | --- |
| A | 入驻与认证（登录/注册/找回密码） |
| B | 景点信息管理（概览/编辑/上下架/审核历史） |
| C | 门票/套餐管理（票种列表/新增/编辑/停售） |
| D | 消息通知（分类列表/已读/详情） |
| E | 营销管理（活动列表/效果统计） |
| F | 评价管理（列表/筛选/回复/编辑/删除） |
| G | 数据统计（Dashboard/打卡趋势/评分趋势/AI报告） |
| H | 账号与设置（基本信息/修改密码） |

## 依赖后端 API

后端商户模块位于 `backend/src/modules/merchant/`，请确保后端服务运行在 `http://localhost:3000`。
