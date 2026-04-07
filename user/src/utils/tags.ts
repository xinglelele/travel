/** 标签去重：trim 后以首次出现为准，用于多 POI 合并后的路线标签 */
export function uniqueTagList(tags?: string[] | null): string[] {
  if (!tags?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tags) {
    const s = String(t).trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}
