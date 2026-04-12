/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** 高德 Web 端 JS API Key（控制台需勾选「Web端(JS API)」） */
  readonly VITE_AMAP_KEY?: string
  /** 高德安全密钥 securityJsCode，需在加载地图脚本前配置（控制台「安全密钥」） */
  readonly VITE_AMAP_SECURITY_JS_CODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
