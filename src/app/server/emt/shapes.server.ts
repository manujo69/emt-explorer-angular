import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ShapePoint, ShapesByDirection } from '../../../features/emt/types/emt.types'
import { LINEA_PARAM_REGEX } from './constants'

const GTFS_DIR = join(process.cwd(), 'data', 'gtfs')
const CACHE_TTL_MS = 1_800_000

interface GtfsCache {
  data: { trips: string; shapes: string }
  loadedAt: number
}

let gtfsCache: GtfsCache | null = null

async function loadGtfsFiles(): Promise<{ trips: string; shapes: string }> {
  const now = Date.now()
  if (gtfsCache && now - gtfsCache.loadedAt < CACHE_TTL_MS) {
    return gtfsCache.data
  }
  const [trips, shapes] = await Promise.all([
    readFile(join(GTFS_DIR, 'trips.csv'), 'utf-8'),
    readFile(join(GTFS_DIR, 'shapes.csv'), 'utf-8'),
  ])
  gtfsCache = { data: { trips, shapes }, loadedAt: now }
  return gtfsCache.data
}

function parseShapeIdsByDirection(tripsCsv: string, codLinea: string): Map<number, string> {
  const lines = tripsCsv.split('\n').map(l => l.trimEnd())
  if (lines.length < 2) return new Map()

  const header = lines[0].split(',')
  const routeIdx = header.indexOf('route_id')
  const dirIdx = header.indexOf('direction_id')
  const shapeIdx = header.indexOf('shape_id')
  if (routeIdx < 0 || dirIdx < 0 || shapeIdx < 0) return new Map()

  const result = new Map<number, string>()
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length <= Math.max(routeIdx, dirIdx, shapeIdx)) continue
    if (cols[routeIdx].trim() !== codLinea) continue
    const sentido = Number(cols[dirIdx].trim()) === 0 ? 1 : 2
    if (!result.has(sentido)) {
      result.set(sentido, cols[shapeIdx].trim())
    }
  }
  return result
}

function parseShapePoints(shapesCsv: string, shapeId: string): ShapePoint[] {
  const lines = shapesCsv.split('\n').map(l => l.trimEnd())
  if (lines.length < 2) return []

  const header = lines[0].split(',')
  const idIdx = header.indexOf('shape_id')
  const latIdx = header.indexOf('shape_pt_lat')
  const lonIdx = header.indexOf('shape_pt_lon')
  const seqIdx = header.indexOf('shape_pt_sequence')
  if (idIdx < 0 || latIdx < 0 || lonIdx < 0 || seqIdx < 0) return []

  const points: ShapePoint[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length <= Math.max(idIdx, latIdx, lonIdx, seqIdx)) continue
    if (cols[idIdx].trim() !== shapeId) continue
    const latitud = Number(cols[latIdx].trim())
    const longitud = Number(cols[lonIdx].trim())
    const sequence = Number(cols[seqIdx].trim())
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud) || !Number.isFinite(sequence)) {
      continue
    }
    points.push({ latitud, longitud, sequence })
  }
  return points.sort((a, b) => a.sequence - b.sequence)
}

function isEnoent(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

export async function shapesHandler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const linea = url.searchParams.get('linea')

  if (!linea || !LINEA_PARAM_REGEX.test(linea)) {
    return Response.json(
      { error: 'Parámetro linea inválido o ausente' },
      { status: 400 },
    )
  }

  try {
    const { trips, shapes } = await loadGtfsFiles()
    const shapeIdsByDirection = parseShapeIdsByDirection(trips, linea)

    const result: ShapesByDirection = {}
    for (const [sentido, shapeId] of shapeIdsByDirection.entries()) {
      result[sentido] = parseShapePoints(shapes, shapeId)
    }

    return Response.json(result, {
      headers: { 'Cache-Control': 's-maxage=1800' },
    })
  } catch (error) {
    if (isEnoent(error)) {
      return Response.json({}, { headers: { 'Cache-Control': 's-maxage=1800' } })
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
