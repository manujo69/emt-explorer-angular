import { inject, Injectable } from '@angular/core'
import { httpResource } from '@angular/common/http'
import { rxResource } from '@angular/core/rxjs-interop'
import { EMPTY, fromEvent, merge, of, timer } from 'rxjs'
import { distinctUntilChanged, map, switchMap, take } from 'rxjs/operators'
import { EMTApiService } from './emt-api.service'
import { EMTStore } from '../store/emt.store'
import type { BusUbicacion, LineaEMT, ParadaEMT, LlegadaLinea, ShapesByDirection } from '../types/emt.types'

export const POLL_INTERVAL_MS = 60_000

@Injectable({ providedIn: 'root' })
export class EMTResourcesService {
  private readonly api = inject(EMTApiService)
  private readonly store = inject(EMTStore)

  readonly lineasResource = httpResource<LineaEMT[]>(() => '/api/emt/lineas')

  readonly paradasResource = httpResource<ParadaEMT[]>(() => {
    const linea = this.store.lineaSeleccionada()
    return linea ? `/api/emt/paradas?linea=${encodeURIComponent(linea)}` : undefined
  })

  readonly shapesResource = httpResource<ShapesByDirection>(() => {
    const linea = this.store.lineaSeleccionada()
    return linea ? `/api/emt/shapes?linea=${encodeURIComponent(linea)}` : undefined
  })

  readonly llegadasResource = httpResource<LlegadaLinea[]>(() => {
    const parada = this.store.paradaSeleccionada()
    return parada ? `/api/emt/llegadas?parada=${encodeURIComponent(parada)}` : undefined
  })

  readonly ubicacionesResource = rxResource({
    params: () => this.store.lineaSeleccionada(),
    stream: ({ params: linea }) => {
      if (!linea) return of([] as BusUbicacion[])
      return merge(of(null), fromEvent(document, 'visibilitychange')).pipe(
        map(() => !document.hidden),
        distinctUntilChanged(),
        switchMap(visible => (visible ? timer(0, POLL_INTERVAL_MS).pipe(take(2)) : EMPTY)),
        switchMap(() => this.api.getUbicaciones(linea)),
      )
    },
  })
}
