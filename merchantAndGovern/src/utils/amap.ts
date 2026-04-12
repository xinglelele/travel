const GEOCODE_TIMEOUT_MS = 20000

function waitForAMapReady(maxTries = 120, intervalMs = 100): Promise<void> {
  return new Promise((resolve, reject) => {
    const tick = (tries: number) => {
      if ((window as any).AMap?.Map) {
        resolve()
        return
      }
      if (tries >= maxTries) {
        reject(new Error('高德地图加载超时，请刷新页面后重试'))
        return
      }
      setTimeout(() => tick(tries + 1), intervalMs)
    }
    tick(0)
  })
}

/** 通过地址文本获取经纬度（GCJ-02，高德坐标系） */
export function geocodeAddress(address: string): Promise<{ lng: number; lat: number }> {
  return new Promise((resolve, reject) => {
    const AMap = (window as any).AMap
    if (!AMap) {
      reject(new Error('高德地图未加载'))
      return
    }

    const timer = window.setTimeout(() => {
      reject(new Error('地址解析超时，请检查网络或稍后重试'))
    }, GEOCODE_TIMEOUT_MS)

    const done = (fn: () => void) => {
      window.clearTimeout(timer)
      fn()
    }

    AMap.plugin('AMap.Geocoder', () => {
      try {
        const geocoder = new AMap.Geocoder({ radius: 500, extensions: 'base' })
        geocoder.getLocation(address, (status: string, result: any) => {
          if (status === 'complete' && result?.info === 'OK' && result.geocodes?.length) {
            const loc = result.geocodes[0].location
            done(() => resolve({ lng: Number(loc.lng), lat: Number(loc.lat) }))
          } else {
            done(() => reject(new Error('地址解析失败，请检查地址是否准确')))
          }
        })
      } catch (e) {
        done(() => reject(e instanceof Error ? e : new Error('地理编码初始化失败')))
      }
    })
  })
}

/**
 * 异步加载高德 JS API 脚本（若尚未加载）。
 * 已加载时直接 resolve，避免重复请求。
 * securityJsCode 配置在 CheckHeatmap.vue 中做了一次，注册页若先触达也走此处。
 */
export function loadAMap(): Promise<void> {
  return new Promise((resolve, reject) => {
    const AMap = (window as any).AMap
    if (AMap?.Map) {
      resolve()
      return
    }

    const key = (import.meta.env.VITE_AMAP_KEY as string) || ''
    if (!key || key === 'YOUR_AMAP_KEY') {
      reject(new Error('请在 .env 中配置 VITE_AMAP_KEY'))
      return
    }

    const code = (import.meta.env.VITE_AMAP_SECURITY_CODE as string) || ''
    ;(window as any)._AMapSecurityConfig = { securityJsCode: code }

    const src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      // 脚本已在 DOM 中（可能仍在加载），必须轮询 AMap 就绪，否则 Promise 永不结束 → 按钮一直转圈
      waitForAMapReady().then(resolve).catch(reject)
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.onload = () => {
      waitForAMapReady().then(resolve).catch(reject)
    }
    script.onerror = () => reject(new Error('高德地图脚本加载失败'))
    document.head.appendChild(script)
  })
}

/** 尝试弹出浏览器定位；若用户拒绝或失败，提示手动获取 */
export async function tryBrowserGeolocation(): Promise<{ lng: number; lat: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('当前浏览器不支持定位'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude })
      },
      () => {
        reject(new Error('定位被拒绝，请手动搜索地址获取坐标'))
      },
      { timeout: 8000 }
    )
  })
}
