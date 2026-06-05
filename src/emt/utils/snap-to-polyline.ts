import type { ShapePoint } from '../types/emt.types'

export function snapToPolyline(
  lat: number,
  lng: number,
  shape: ShapePoint[],
): { lat: number; lng: number } {
  if (shape.length === 0) return { lat, lng }
  if (shape.length === 1) return { lat: shape[0].latitud, lng: shape[0].longitud }

  let bestDist = Infinity
  let bestLat = shape[0].latitud
  let bestLng = shape[0].longitud

  for (let i = 0; i < shape.length - 1; i++) {
    const ax = shape[i].longitud
    const ay = shape[i].latitud
    const bx = shape[i + 1].longitud
    const by = shape[i + 1].latitud

    const abx = bx - ax
    const aby = by - ay
    const lenSq = abx * abx + aby * aby

    let t = 0
    if (lenSq > 0) {
      t = ((lng - ax) * abx + (lat - ay) * aby) / lenSq
      t = Math.max(0, Math.min(1, t))
    }

    const px = ax + t * abx
    const py = ay + t * aby
    const dx = lng - px
    const dy = lat - py
    const dist = dx * dx + dy * dy

    if (dist < bestDist) {
      bestDist = dist
      bestLat = py
      bestLng = px
    }
  }

  return { lat: bestLat, lng: bestLng }
}
