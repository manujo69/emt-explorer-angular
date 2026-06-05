import fc from 'fast-check'
import {
  detectDelimiter,
  parseCSVLine,
  normalizeCodLinea,
  parseUbicacionesCSV,
  parseLineasCSV,
  parseParadasCSV,
} from './csv-parser'

// ── Real headers from datosabiertos.malaga.eu ────────────────────────────────

const UBICACIONES_HEADER =
  '"codBus","codLinea","sentido","lon","lat","codParIni","last_update"'

const PARADAS_HEADER =
  '"codLinea","codLineaStr","codLineaStrSin","userCodLinea","nombreLinea","observaciones",' +
  '"cabeceraIda","cabeceraVuelta","avisoSinHorarioEs","avisoSinHorarioEn","tagsAccesibilidad",' +
  '"linea","sentido","orden","espera","fechaInicioDemanda","fechaFinDemanda","codParada",' +
  '"nombreParada","direccion","lon","lat","lineas"'

// ── CSV helpers ───────────────────────────────────────────────────────────────

function q(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`
}

function ubicacionRow(
  codBus: string,
  codLinea: string,
  sentido: number,
  lon: number,
  lat: number,
  codParIni = '100',
): string {
  return [q(codBus), q(`${codLinea}.0`), q(sentido), q(lon), q(lat), q(codParIni), q('2026-01-01 00:00:00')].join(',')
}

function paradaRow(
  codLinea: string,
  sentido: number,
  orden: number,
  codParada: string,
  lon: number,
  lat: number,
  nombreLinea = 'Línea test',
  cabIda = 'Ida',
  cabVuelta = 'Vuelta',
  userCodLinea = codLinea,
): string {
  return [
    q(`${codLinea}.0`), q(codLinea), q(codLinea), q(userCodLinea), q(nombreLinea), q(''),
    q(cabIda), q(cabVuelta), q(''), q(''), q(''), q(''),
    q(sentido), q(orden), q(''), q(''), q(''), q(codParada),
    q(`Parada ${codParada}`), q('CALLE X'), q(lon), q(lat), q(''),
  ].join(',')
}

// ── detectDelimiter ───────────────────────────────────────────────────────────

describe('detectDelimiter', () => {
  it('returns comma for comma-delimited header', () => {
    expect(detectDelimiter('"a","b","c"')).toBe(',')
  })

  it('returns semicolon for semicolon-delimited header', () => {
    expect(detectDelimiter('"a";"b";"c"')).toBe(';')
  })

  it('defaults to comma when counts tie', () => {
    expect(detectDelimiter('a;b,c')).toBe(',')
  })
})

// ── parseCSVLine ──────────────────────────────────────────────────────────────

describe('parseCSVLine', () => {
  it('parses simple quoted fields', () => {
    expect(parseCSVLine('"a","b","c"', ',')).toEqual(['a', 'b', 'c'])
  })

  it('parses unquoted fields', () => {
    expect(parseCSVLine('a,b,c', ',')).toEqual(['a', 'b', 'c'])
  })

  it('handles escaped double-quotes inside quoted fields', () => {
    expect(parseCSVLine('"a""b"', ',')).toEqual(['a"b'])
  })

  it('handles empty quoted field', () => {
    expect(parseCSVLine('""', ',')).toEqual([''])
  })

  it('handles field with comma inside quotes', () => {
    expect(parseCSVLine('"a,b","c"', ',')).toEqual(['a,b', 'c'])
  })

  it('handles semicolon delimiter', () => {
    expect(parseCSVLine('"a";"b"', ';')).toEqual(['a', 'b'])
  })

  it('returns single empty string for empty line', () => {
    expect(parseCSVLine('', ',')).toEqual([''])
  })

  it('handles real ubicaciones data row', () => {
    const row = '"581","1.0","2","-4.456579","36.697693","1253","2026-05-25 19:45:06"'
    const cols = parseCSVLine(row, ',')
    expect(cols[0]).toBe('581')
    expect(cols[1]).toBe('1.0')
    expect(cols[3]).toBe('-4.456579')
  })
})

// ── normalizeCodLinea ─────────────────────────────────────────────────────────

describe('normalizeCodLinea', () => {
  it.each([
    ['1.0', '1'],
    ['10.0', '10'],
    ['C1.0', 'C1'],
    ['1', '1'],
    [' 1.0 ', '1'],
    ['11.0', '11'],
  ])('normalizes %s → %s', (input, expected) => {
    expect(normalizeCodLinea(input)).toBe(expected)
  })
})

// ── parseUbicacionesCSV ───────────────────────────────────────────────────────

describe('parseUbicacionesCSV', () => {
  it('returns [] for empty string', () => {
    expect(parseUbicacionesCSV('')).toEqual([])
  })

  it('returns [] for header only', () => {
    expect(parseUbicacionesCSV(UBICACIONES_HEADER)).toEqual([])
  })

  it('strips BOM from start of input', () => {
    const csv = '﻿' + UBICACIONES_HEADER + '\n' + ubicacionRow('1', '1', 2, -4.45, 36.69)
    expect(parseUbicacionesCSV(csv)).toHaveLength(1)
  })

  it('parses a valid row correctly', () => {
    const csv = UBICACIONES_HEADER + '\n' + ubicacionRow('581', '1', 2, -4.456579, 36.697693, '1253')
    const [bus] = parseUbicacionesCSV(csv)
    expect(bus).toEqual({
      codBus: '581',
      codLinea: '1',
      sentido: 2,
      longitud: -4.456579,
      latitud: 36.697693,
      codParIni: '1253',
      lastUpdate: '2026-01-01 00:00:00',
    })
  })

  it('normalizes codLinea from float-string', () => {
    const csv = UBICACIONES_HEADER + '\n' + ubicacionRow('1', '10', 1, -4.4, 36.7)
    const [bus] = parseUbicacionesCSV(csv)
    expect(bus.codLinea).toBe('10')
  })

  it('skips rows with coordinates out of range', () => {
    const csv = [
      UBICACIONES_HEADER,
      ubicacionRow('1', '1', 1, 200, 36.7),   // lon > 180
      ubicacionRow('2', '1', 1, -4.4, 100),    // lat > 90
      ubicacionRow('3', '1', 1, -4.4, 36.7),   // valid
    ].join('\n')
    const result = parseUbicacionesCSV(csv)
    expect(result).toHaveLength(1)
    expect(result[0].codBus).toBe('3')
  })

  it('skips rows with empty codLinea', () => {
    const csv = UBICACIONES_HEADER + '\n' + ubicacionRow('1', '', 1, -4.4, 36.7)
    expect(parseUbicacionesCSV(csv)).toHaveLength(0)
  })

  it('returns [] when required columns are missing', () => {
    expect(parseUbicacionesCSV('"foo","bar"\n"a","b"')).toEqual([])
  })
})

// ── parseLineasCSV ────────────────────────────────────────────────────────────

describe('parseLineasCSV', () => {
  it('returns [] for empty string', () => {
    expect(parseLineasCSV('')).toEqual([])
  })

  it('returns [] for header only', () => {
    expect(parseLineasCSV(PARADAS_HEADER)).toEqual([])
  })

  it('deduplicates rows by codLinea (keeps first)', () => {
    const csv = [
      PARADAS_HEADER,
      paradaRow('1', 1, 1, '100', -4.4, 36.7, 'Línea 1'),
      paradaRow('1', 1, 2, '101', -4.41, 36.71, 'Línea 1 bis'),
      paradaRow('2', 1, 1, '200', -4.5, 36.8, 'Línea 2'),
    ].join('\n')
    const result = parseLineasCSV(csv)
    expect(result).toHaveLength(2)
    expect(result.find(l => l.codLinea === '1')?.nombreLinea).toBe('Línea 1')
  })

  it('includes cabeceraIda and cabeceraVuelta', () => {
    const csv = [
      PARADAS_HEADER,
      paradaRow('1', 1, 1, '100', -4.4, 36.7, 'L1', 'Terminal Norte', 'Terminal Sur'),
    ].join('\n')
    const [linea] = parseLineasCSV(csv)
    expect(linea.cabeceraIda).toBe('Terminal Norte')
    expect(linea.cabeceraVuelta).toBe('Terminal Sur')
  })

  it('sets cabecera fields to undefined when empty', () => {
    const csv = [
      PARADAS_HEADER,
      paradaRow('1', 1, 1, '100', -4.4, 36.7, 'L1', '', ''),
    ].join('\n')
    const [linea] = parseLineasCSV(csv)
    expect(linea.cabeceraIda).toBeUndefined()
    expect(linea.cabeceraVuelta).toBeUndefined()
  })

  it('reads userCodLinea as user-friendly code distinct from codLinea', () => {
    const csv = [
      PARADAS_HEADER,
      paradaRow('10', 1, 1, '100', -4.4, 36.7, 'L10', 'Ida', 'Vuelta', 'C10'),
    ].join('\n')
    const [linea] = parseLineasCSV(csv)
    expect(linea.codLinea).toBe('10')
    expect(linea.userCodLinea).toBe('C10')
  })
})

// ── parseParadasCSV ───────────────────────────────────────────────────────────

describe('parseParadasCSV', () => {
  it('returns [] for empty string', () => {
    expect(parseParadasCSV('')).toEqual([])
  })

  it('parses a valid row correctly', () => {
    const csv = [
      PARADAS_HEADER,
      paradaRow('1', 2, 3, '152', -4.4222507, 36.737835),
    ].join('\n')
    const [parada] = parseParadasCSV(csv)
    expect(parada).toEqual({
      codLinea: '1',
      codParada: '152',
      nombreParada: 'Parada 152',
      sentido: 2,
      orden: 3,
      longitud: -4.4222507,
      latitud: 36.737835,
    })
  })

  it('skips rows with coordinates out of range', () => {
    const csv = [
      PARADAS_HEADER,
      paradaRow('1', 1, 1, '100', 999, 36.7),
      paradaRow('1', 1, 2, '101', -4.4, 36.7),
    ].join('\n')
    expect(parseParadasCSV(csv)).toHaveLength(1)
  })
})

// ── Property tests (fast-check) ───────────────────────────────────────────────

const codLineaArb = fc.stringMatching(/^[A-Za-z0-9]{1,4}$/)
const latArb = fc.float({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true })
const lonArb = fc.float({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true })

describe('Property 1: parseUbicacionesCSV shape and range validity', () => {
  it('every returned object has valid codLinea, lat in [-90,90], lon in [-180,180]', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ codBus: fc.string({ minLength: 1, maxLength: 4 }), codLinea: codLineaArb, sentido: fc.integer({ min: 1, max: 2 }), lon: lonArb, lat: latArb }),
          { minLength: 1, maxLength: 10 },
        ),
        (rows) => {
          const csv =
            UBICACIONES_HEADER +
            '\n' +
            rows.map(r => ubicacionRow(r.codBus, r.codLinea, r.sentido, r.lon, r.lat)).join('\n')
          const result = parseUbicacionesCSV(csv)
          expect(result.length).toBe(rows.length)
          for (const bus of result) {
            expect(bus.codLinea.length).toBeGreaterThan(0)
            expect(bus.latitud).toBeGreaterThanOrEqual(-90)
            expect(bus.latitud).toBeLessThanOrEqual(90)
            expect(bus.longitud).toBeGreaterThanOrEqual(-180)
            expect(bus.longitud).toBeLessThanOrEqual(180)
          }
        },
      ),
    )
  })
})

describe('Property 2: parseLineasCSV no duplicates and valid shape', () => {
  it('returns no duplicate codLinea entries', () => {
    fc.assert(
      fc.property(
        fc.array(codLineaArb, { minLength: 1, maxLength: 10 }),
        (codLineas) => {
          const csv =
            PARADAS_HEADER +
            '\n' +
            codLineas.map(cl => paradaRow(cl, 1, 1, '100', -4.4, 36.7, `Línea ${cl}`)).join('\n')
          const result = parseLineasCSV(csv)
          const seen = new Set<string>()
          for (const linea of result) {
            expect(linea.codLinea.length).toBeGreaterThan(0)
            expect(linea.userCodLinea.length).toBeGreaterThan(0)
            expect(linea.nombreLinea.length).toBeGreaterThan(0)
            expect(seen.has(linea.codLinea)).toBe(false)
            seen.add(linea.codLinea)
          }
        },
      ),
    )
  })
})

describe('Property 3: invalid rows are discarded, valid rows are preserved', () => {
  it('valid rows survive alongside invalid ones without throwing', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ codBus: fc.string({ minLength: 1, maxLength: 4 }), codLinea: codLineaArb, sentido: fc.integer({ min: 1, max: 2 }), lon: lonArb, lat: latArb }),
          { minLength: 1, maxLength: 5 },
        ),
        (validRows) => {
          const invalidRows = [
            '"bad"',
            '"x","","1","0","0","p","2026-01-01"',
            '"x","1.0","1","999","0","p","2026-01-01"',
          ]
          const allRows = [
            ...validRows.map(r => ubicacionRow(r.codBus, r.codLinea, r.sentido, r.lon, r.lat)),
            ...invalidRows,
          ]
          const csv = UBICACIONES_HEADER + '\n' + allRows.join('\n')
          expect(() => parseUbicacionesCSV(csv)).not.toThrow()
          const result = parseUbicacionesCSV(csv)
          expect(result.length).toBe(validRows.length)
        },
      ),
    )
  })
})

describe('Property 4: whitespace is trimmed from all string fields', () => {
  it('string fields are trimmed', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 6 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
        (codLinea) => {
          const csv =
            UBICACIONES_HEADER +
            '\n' +
            `"  581  ","  ${codLinea}.0  ","1","-4.4","36.7","  p100  ","  2026-01-01  "`
          const result = parseUbicacionesCSV(csv)
          if (result.length > 0) {
            expect(result[0].codBus).toBe(result[0].codBus.trim())
            expect(result[0].codParIni).toBe(result[0].codParIni.trim())
            expect(result[0].lastUpdate).toBe(result[0].lastUpdate.trim())
          }
        },
      ),
    )
  })
})
