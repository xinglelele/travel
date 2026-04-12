// 日期格式化工具
export function formatDate(date: string | Date, fmt = 'YYYY-MM-DD HH:mm') {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return fmt === 'date'
    ? `${year}-${month}-${day}`
    : `${year}-${month}-${day} ${hour}:${minute}`
}

// 相对时间
export function timeAgo(date: string | Date): string {
  if (!date) return ''
  const now = Date.now()
  const d = new Date(date).getTime()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return formatDate(date, 'date')
}