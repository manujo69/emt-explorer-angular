export interface BusUbicacion {
  codBus: string
  codLinea: string
  sentido: number
  longitud: number
  latitud: number
  codParIni: string
  lastUpdate: string
}

export interface LineaEMT {
  codLinea: string
  userCodLinea: string
  nombreLinea: string
  cabeceraIda?: string
  cabeceraVuelta?: string
}

export interface ParadaEMT {
  codLinea: string
  codParada: string
  nombreParada: string
  sentido: number
  orden: number
  longitud: number
  latitud: number
}

export interface LlegadaLinea {
  codLinea: string
  nombreLinea: string
  sentido: number
  destino: string
  proximoBus: {
    codBus: string
    minutos: number
  }
}

export interface ShapePoint {
  latitud: number
  longitud: number
  sequence: number
}

export type ShapesByDirection = Record<number, ShapePoint[]>

export interface ApiError {
  error: string
}
