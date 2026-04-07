/**
 * 系统信息兼容工具
 * 使用静态默认值，避免任何 deprecated 警告
 * 注意：在不同设备上可能需要根据实际尺寸做适配
 */

// 静态默认值（iPhone 6/7/8 尺寸）
export const systemInfo = {
    windowWidth: 375,
    windowHeight: 667,
    statusBarHeight: 20,
    screenWidth: 375,
    screenHeight: 667,
    safeArea: { left: 0, right: 375, top: 20, bottom: 667 },
    navigationBarHeight: 44,
    titleBarHeight: 44,
}

/**
 * 初始化系统信息（空实现，保留 API 兼容性）
 * 由于微信开发者工具版本差异，不再尝试调用 API
 */
export function initSystemInfo() {
    // 静默空实现，不再调用任何可能 deprecated 的 API
}

/**
 * 获取屏幕宽度
 */
export function getScreenWidth(): number {
    return systemInfo.windowWidth
}

/**
 * 获取屏幕高度
 */
export function getScreenHeight(): number {
    return systemInfo.windowHeight
}

/**
 * 获取状态栏高度
 */
export function getStatusBarHeight(): number {
    return systemInfo.statusBarHeight
}

/**
 * 获取安全区域
 */
export function getSafeArea() {
    return systemInfo.safeArea
}

/**
 * 获取系统信息对象
 */
export function getSystemInfo() {
    return systemInfo
}
