import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import type { Observable } from 'rxjs'
import type { BusUbicacion, LineaEMT, ParadaEMT, LlegadaLinea, ShapesByDirection } from '../types/emt.types'

@Injectable({ providedIn: 'root' })
export class EMTApiService {
  private readonly http = inject(HttpClient)

  getLineas(): Observable<LineaEMT[]> {
    return this.http.get<LineaEMT[]>('/api/emt/lineas')
  }

  getUbicaciones(linea: string): Observable<BusUbicacion[]> {
    return this.http.get<BusUbicacion[]>(`/api/emt/ubicaciones?linea=${encodeURIComponent(linea)}`)
  }

  getParadas(linea: string): Observable<ParadaEMT[]> {
    return this.http.get<ParadaEMT[]>(`/api/emt/paradas?linea=${encodeURIComponent(linea)}`)
  }

  getShapes(linea: string): Observable<ShapesByDirection> {
    return this.http.get<ShapesByDirection>(`/api/emt/shapes?linea=${encodeURIComponent(linea)}`)
  }

  getLlegadas(parada: string): Observable<LlegadaLinea[]> {
    return this.http.get<LlegadaLinea[]>(`/api/emt/llegadas?parada=${encodeURIComponent(parada)}`)
  }
}
