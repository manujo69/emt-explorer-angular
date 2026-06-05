import type { LineaEMT } from '../types/emt.types'

// Each entry is [sentido1Color, sentido2Color] — complementary pairs
const PALETTE: ReadonlyArray<readonly [string, string]> = [
  ['#1E88E5', '#F57C00'],
  ['#43A047', '#E53935'],
  ['#8E24AA', '#F9A825'],
  ['#00ACC1', '#D81B60'],
  ['#3949AB', '#00897B'],
  ['#F4511E', '#5C6BC0'],
  ['#039BE5', '#C0CA33'],
  ['#7CB342', '#EF5350'],
  ['#FFB300', '#5E35B1'],
  ['#00BCD4', '#FF7043'],
  ['#26A69A', '#EC407A'],
  ['#AB47BC', '#66BB6A'],
  ['#26C6DA', '#FF8F00'],
  ['#9CCC65', '#7E57C2'],
  ['#EF5350', '#42A5F5'],
]

function paletteIndex(codLinea: string): number {
  const n = parseInt(codLinea, 10)
  const key = Number.isNaN(n) ? codLinea.charCodeAt(0) : n
  return Math.abs(key) % PALETTE.length
}

export function getLineaColor(codLinea: string): string {
  return PALETTE[paletteIndex(codLinea)][0]
}

export function getSentidoColor(codLinea: string, sentido: number): string {
  const pair = PALETTE[paletteIndex(codLinea)]
  return sentido === 1 ? pair[0] : pair[1]
}

function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function getTextColor(bgColor: string): string {
  return relativeLuminance(bgColor) > 0.179 ? '#000000' : '#ffffff'
}

export function getTextShadow(bgColor: string): string {
  return relativeLuminance(bgColor) > 0.179
    ? '0 0 3px rgba(0,0,0,0.35)'
    : '0 0 4px rgba(0,0,0,0.75)'
}

export function getLineaLabel(linea: LineaEMT): string {
  return linea.userCodLinea || linea.codLinea
}
