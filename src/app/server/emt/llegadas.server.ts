import type { LlegadaLinea } from '../../../emt/types/emt.types'
import { parseLineasCSV, parseParadasCSV, parseUbicacionesCSV } from '../../../emt/utils/csv-parser'
import { haversine } from '../../../shared/utils/haversine'
import { EMT_LINEAS_URL, EMT_UBICACIONES_URL, PARADA_PARAM_REGEX } from './constants'
import { fetchEMT } from './emt-http'

const EMT_MOBILE_BASE = 'https://www.emtmalaga.es/informacionParada.html'
const SPEED_M_PER_MIN = 200

function parseLlegadasFromHtml(html: string): LlegadaLinea[] | null {
  // EMT Mobile page: rows with line, destination, minutes
  // Pattern: line code, destination text, and a number followed by "min"
  const rowPattern =
    /<tr[^>]*>[\s\S]*?<td[^>]*>(\d+[A-Z]?)<\/td>[\s\S]*?<td[^>]*>(.*?)<\/td>[\s\S]*?<td[^>]*>(\d+)\s*min[\s\S]*?<\/td>[\s\S]*?<\/tr>/gi
  const results: LlegadaLinea[] = []
  let match: RegExpExecArray | null

  while ((match = rowPattern.exec(html)) !== null) {
    const codLinea = match[1].trim()
    const destino = match[2].replace(/<[^>]+>/g, '').trim()
    const minutos = parseInt(match[3], 10)
    if (codLinea && Number.isFinite(minutos)) {
      results.push({
        codLinea,
        nombreLinea: codLinea,
        sentido: 1,
        destino: destino || codLinea,
        proximoBus: { codBus: '', minutos },
      })
    }
  }

  return results.length > 0 ? results : null
}

function computeHaversineFallback(
  paradasCsv: string,
  ubicacionesCsv: string,
  codParada: string,
): LlegadaLinea[] {
  const todasParadas = parseParadasCSV(paradasCsv)
  const buses = parseUbicacionesCSV(ubicacionesCsv)
  const lineas = parseLineasCSV(paradasCsv)
  const lineasMap = new Map(lineas.map((l) => [l.codLinea, l]))

  // Find which lines and sentidos serve this stop
  const paradaEntries = todasParadas.filter((p) => p.codParada === codParada)
  if (paradaEntries.length === 0) return []

  const llegadas: LlegadaLinea[] = []

  for (const targetParada of paradaEntries) {
    const { codLinea, sentido } = targetParada

    // Paradas for this line+sentido sorted DESCENDING by orden
    const routeParadas = todasParadas
      .filter((p) => p.codLinea === codLinea && p.sentido === sentido)
      .sort((a, b) => b.orden - a.orden)

    const targetIdx = routeParadas.findIndex((p) => p.codParada === codParada)
    if (targetIdx < 0) continue

    // Build index map: codParada → descending-order index
    const paradaIndexMap = new Map(routeParadas.map((p, i) => [p.codParada, i]))

    // Buses on this line in this sentido
    const lineaBuses = buses.filter((b) => b.codLinea === codLinea && b.sentido === sentido)

    let bestBus: { codBus: string; minutos: number } | null = null

    for (const bus of lineaBuses) {
      const busIdx = paradaIndexMap.get(bus.codParIni) ?? -1
      // busIdx > targetIdx means bus is at a lower-orden stop (behind the target, approaching)
      if (busIdx <= targetIdx) continue

      const distM = haversine(targetParada.latitud, targetParada.longitud, bus.latitud, bus.longitud)
      const minutos = Math.max(0, Math.round(distM / SPEED_M_PER_MIN))

      if (!bestBus || minutos < bestBus.minutos) {
        bestBus = { codBus: bus.codBus, minutos }
      }
    }

    if (bestBus) {
      const linea = lineasMap.get(codLinea)
      const nombreLinea = linea?.nombreLinea ?? codLinea
      const destino =
        sentido === 1
          ? (linea?.cabeceraVuelta ?? nombreLinea)
          : (linea?.cabeceraIda ?? nombreLinea)

      llegadas.push({
        codLinea,
        nombreLinea,
        sentido,
        destino,
        proximoBus: bestBus,
      })
    }
  }

  // Suppress redundant: keep only the entry with minimum minutos per codLinea
  const best = new Map<string, LlegadaLinea>()
  for (const ll of llegadas) {
    const key = `${ll.codLinea}-${ll.sentido}`
    const prev = best.get(key)
    if (!prev || ll.proximoBus.minutos < prev.proximoBus.minutos) {
      best.set(key, ll)
    }
  }

  return [...best.values()].sort((a, b) => a.proximoBus.minutos - b.proximoBus.minutos)
}

export async function llegadasHandler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const parada = url.searchParams.get('parada')

  if (!parada || !PARADA_PARAM_REGEX.test(parada)) {
    return Response.json(
      { error: 'Parámetro parada inválido o ausente' },
      { status: 400 },
    )
  }

  // Attempt EMT Mobile scraping
  try {
    const mobileRes = await fetchEMT(`${EMT_MOBILE_BASE}?codParada=${parada}`)
    if (mobileRes.ok) {
      const html = await mobileRes.text()
      const llegadas = parseLlegadasFromHtml(html)
      if (llegadas !== null) {
        return Response.json(
          llegadas.sort((a, b) => a.proximoBus.minutos - b.proximoBus.minutos),
          { headers: { 'Cache-Control': 'no-store' } },
        )
      }
    }
  } catch {
    // Falls through to Haversine fallback
  }

  // Haversine fallback
  try {
    const [lineasRes, ubicacionesRes] = await Promise.all([
      fetchEMT(EMT_LINEAS_URL),
      fetchEMT(EMT_UBICACIONES_URL),
    ])

    if (!lineasRes.ok || !ubicacionesRes.ok) {
      return Response.json({ error: 'Error al obtener datos de EMT' }, { status: 502 })
    }

    const [paradasCsv, ubicacionesCsv] = await Promise.all([
      lineasRes.text(),
      ubicacionesRes.text(),
    ])

    const llegadas = computeHaversineFallback(paradasCsv, ubicacionesCsv, parada)
    return Response.json(llegadas, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
