import { env } from '../config/env'

interface AmapLocation {
  longitude: number
  latitude: number
}

interface AmapPoiSearchResult {
  pois: Array<{
    id: string
    name: string
    location: string
    address: string
    type: string
  }>
}

export async function geocode(address: string): Promise<AmapLocation | null> {
  const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${env.amap.key}`

  const response = await fetch(url)
  const data = await response.json() as { status?: string; geocodes?: Array<{ location: string }> }

  if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
    const [lng, lat] = data.geocodes[0].location.split(',')
    return { longitude: parseFloat(lng), latitude: parseFloat(lat) }
  }

  return null
}

export async function searchPoi(keyword: string, city?: string): Promise<AmapPoiSearchResult> {
  const params = new URLSearchParams({
    keywords: keyword,
    key: env.amap.key,
    output: 'json',
  })

  if (city) {
    params.append('city', city)
  }

  const url = `https://restapi.amap.com/v3/place/text?${params.toString()}`

  const response = await fetch(url)
  const data = await response.json() as { pois?: any[] }

  return {
    pois: (data.pois || []).map((poi: any) => ({
      id: poi.id,
      name: poi.name,
      location: poi.location,
      address: poi.address,
      type: poi.type,
    })),
  }
}
