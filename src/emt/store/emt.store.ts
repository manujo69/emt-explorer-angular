import { patchState, signalStore, withMethods, withState } from '@ngrx/signals'

interface EMTState {
  lineaSeleccionada: string | null
  sentidosActivos: number[]
  paradaSeleccionada: string | null
}

const initialState: EMTState = {
  lineaSeleccionada: null,
  sentidosActivos: [1, 2],
  paradaSeleccionada: null,
}

export const EMTStore = signalStore(
  { providedIn: 'root' },
  withState<EMTState>(initialState),
  withMethods((store) => ({
    setLineaSeleccionada(linea: string | null): void {
      patchState(store, {
        lineaSeleccionada: linea,
        sentidosActivos: [1, 2],
        paradaSeleccionada: null,
      })
    },
    toggleSentido(sentido: number): void {
      const current = store.sentidosActivos()
      const next = current.includes(sentido)
        ? current.filter((s) => s !== sentido)
        : [...current, sentido]
      if (next.length === 0) return
      patchState(store, { sentidosActivos: next })
    },
    setParadaSeleccionada(parada: string | null): void {
      patchState(store, { paradaSeleccionada: parada })
    },
  })),
)
