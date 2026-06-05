import { parseParadasCSV } from '../../../emt/utils/csv-parser'
import { EMT_LINEAS_URL, LINEA_PARAM_REGEX } from './constants'
import { fetchEMT } from './emt-http'

export async function paradasHandler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const linea = url.searchParams.get('linea')

  if (!linea || !LINEA_PARAM_REGEX.test(linea)) {
    return Response.json(
      { error: 'Parámetro linea inválido o ausente' },
      { status: 400 },
    )
  }

  try {
    const res = await fetchEMT(EMT_LINEAS_URL)
    if (!res.ok) {
      return Response.json(
        { error: 'Error al obtener datos de EMT' },
        { status: res.status },
      )
    }
    const csv = await res.text()
    const paradas = parseParadasCSV(csv)
      .filter((p) => p.codLinea === linea)
      .sort((a, b) => a.sentido - b.sentido || a.orden - b.orden)
    return Response.json(paradas, {
      headers: { 'Cache-Control': 's-maxage=1800' },
    })
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
