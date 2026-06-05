import type { BusUbicacion, LineaEMT, ParadaEMT } from '../../features/emt/types/emt.types'

export function detectDelimiter(line: string): string {
  const semicolons = (line.match(/;/g) ?? []).length
  const commas = (line.match(/,/g) ?? []).length
  return semicolons > commas ? ';' : ','
}

export function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let i = 0
  let field = ''
  let inQuotes = false

  while (i < line.length) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        field += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === delimiter) {
        result.push(field)
        field = ''
        i++
      } else {
        field += ch
        i++
      }
    }
  }

  result.push(field)
  return result
}

export function normalizeCodLinea(raw: string): string {
  return raw.trim().replace(/\.0$/, '')
}

function stripBOM(text: string): string {
  return text.startsWith('﻿') ? text.slice(1) : text
}

function splitLines(csv: string): string[] {
  return stripBOM(csv).split('\n').map(l => l.trimEnd())
}

export function parseUbicacionesCSV(csv: string): BusUbicacion[] {
  const lines = splitLines(csv)
  if (lines.length < 2) return []

  const delimiter = detectDelimiter(lines[0])
  const header = parseCSVLine(lines[0], delimiter)

  const iCodBus = header.indexOf('codBus')
  const iCodLinea = header.indexOf('codLinea')
  const iSentido = header.indexOf('sentido')
  const iLon = header.indexOf('lon')
  const iLat = header.indexOf('lat')
  const iCodParIni = header.indexOf('codParIni')
  const iLastUpdate = header.indexOf('last_update')

  if ([iCodBus, iCodLinea, iSentido, iLon, iLat, iCodParIni, iLastUpdate].some(i => i === -1)) {
    return []
  }

  const result: BusUbicacion[] = []

  for (let n = 1; n < lines.length; n++) {
    if (!lines[n]) continue
    const cols = parseCSVLine(lines[n], delimiter)

    const codLinea = normalizeCodLinea(cols[iCodLinea] ?? '')
    const longitud = parseFloat(cols[iLon] ?? '')
    const latitud = parseFloat(cols[iLat] ?? '')
    const sentido = parseInt(cols[iSentido] ?? '', 10)

    if (
      !codLinea ||
      !Number.isFinite(longitud) || longitud < -180 || longitud > 180 ||
      !Number.isFinite(latitud) || latitud < -90 || latitud > 90 ||
      !Number.isFinite(sentido)
    ) {
      continue
    }

    result.push({
      codBus: (cols[iCodBus] ?? '').trim(),
      codLinea,
      sentido,
      longitud,
      latitud,
      codParIni: (cols[iCodParIni] ?? '').trim(),
      lastUpdate: (cols[iLastUpdate] ?? '').trim(),
    })
  }

  return result
}

export function parseLineasCSV(csv: string): LineaEMT[] {
  const lines = splitLines(csv)
  if (lines.length < 2) return []

  const delimiter = detectDelimiter(lines[0])
  const header = parseCSVLine(lines[0], delimiter)

  const iCodLinea = header.indexOf('codLineaStr')
  const iUserCodLinea = header.indexOf('userCodLinea')
  const iNombre = header.indexOf('nombreLinea')
  const iCabIda = header.indexOf('cabeceraIda')
  const iCabVuelta = header.indexOf('cabeceraVuelta')

  if (iCodLinea === -1 || iNombre === -1) return []

  const seen = new Map<string, LineaEMT>()

  for (let n = 1; n < lines.length; n++) {
    if (!lines[n]) continue
    const cols = parseCSVLine(lines[n], delimiter)

    const codLinea = (cols[iCodLinea] ?? '').trim()
    const userCodLinea = iUserCodLinea !== -1 ? (cols[iUserCodLinea] ?? '').trim() : codLinea
    const nombreLinea = (cols[iNombre] ?? '').trim()

    if (!codLinea || !nombreLinea || seen.has(codLinea)) continue

    seen.set(codLinea, {
      codLinea,
      userCodLinea,
      nombreLinea,
      cabeceraIda: iCabIda !== -1 ? (cols[iCabIda] ?? '').trim() || undefined : undefined,
      cabeceraVuelta: iCabVuelta !== -1 ? (cols[iCabVuelta] ?? '').trim() || undefined : undefined,
    })
  }

  return Array.from(seen.values())
}

export function parseParadasCSV(csv: string): ParadaEMT[] {
  const lines = splitLines(csv)
  if (lines.length < 2) return []

  const delimiter = detectDelimiter(lines[0])
  const header = parseCSVLine(lines[0], delimiter)

  const iCodLinea = header.indexOf('codLineaStr')
  const iCodParada = header.indexOf('codParada')
  const iNombreParada = header.indexOf('nombreParada')
  const iSentido = header.indexOf('sentido')
  const iOrden = header.indexOf('orden')
  const iLon = header.indexOf('lon')
  const iLat = header.indexOf('lat')

  if ([iCodLinea, iCodParada, iNombreParada, iSentido, iOrden, iLon, iLat].some(i => i === -1)) {
    return []
  }

  const result: ParadaEMT[] = []

  for (let n = 1; n < lines.length; n++) {
    if (!lines[n]) continue
    const cols = parseCSVLine(lines[n], delimiter)

    const codLinea = (cols[iCodLinea] ?? '').trim()
    const codParada = (cols[iCodParada] ?? '').trim()
    const nombreParada = (cols[iNombreParada] ?? '').trim()
    const sentido = parseInt(cols[iSentido] ?? '', 10)
    const orden = parseInt(cols[iOrden] ?? '', 10)
    const longitud = parseFloat(cols[iLon] ?? '')
    const latitud = parseFloat(cols[iLat] ?? '')

    if (
      !codLinea || !codParada || !nombreParada ||
      !Number.isFinite(sentido) || !Number.isFinite(orden) ||
      !Number.isFinite(longitud) || longitud < -180 || longitud > 180 ||
      !Number.isFinite(latitud) || latitud < -90 || latitud > 90
    ) {
      continue
    }

    result.push({ codLinea, codParada, nombreParada, sentido, orden, longitud, latitud })
  }

  return result
}
