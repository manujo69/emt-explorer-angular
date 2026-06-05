import { parseUbicacionesCSV } from '../../../shared/utils/csv-parser'
import { EMT_UBICACIONES_URL, LINEA_PARAM_REGEX } from './constants'
import { fetchEMT } from './emt-http'

export async function ubicacionesHandler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const linea = url.searchParams.get('linea')

  if (!linea || !LINEA_PARAM_REGEX.test(linea)) {
    return Response.json(
      { error: 'Parámetro linea inválido o ausente' },
      { status: 400 },
    )
  }

  try {
    const res = await fetchEMT(EMT_UBICACIONES_URL)
    if (!res.ok) {
      return Response.json(
        { error: 'Error al obtener datos de EMT' },
        { status: res.status },
      )
    }
    const csv = await res.text()
    const buses = parseUbicacionesCSV(csv).filter((b) => b.codLinea === linea)
    return Response.json(buses, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
