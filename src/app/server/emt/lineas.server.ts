import { parseLineasCSV } from '../../../emt/utils/csv-parser'
import { EMT_LINEAS_URL } from './constants'
import { fetchEMT } from './emt-http'

export async function lineasHandler(_req: Request): Promise<Response> {
  try {
    const res = await fetchEMT(EMT_LINEAS_URL)
    if (!res.ok) {
      return Response.json(
        { error: 'Error al obtener datos de EMT' },
        { status: res.status },
      )
    }
    const csv = await res.text()
    const lineas = parseLineasCSV(csv).sort((a, b) =>
      a.codLinea.localeCompare(b.codLinea),
    )
    return Response.json(lineas, {
      headers: { 'Cache-Control': 's-maxage=3600' },
    })
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
