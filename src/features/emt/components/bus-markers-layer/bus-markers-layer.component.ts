import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import type { BusUbicacion } from '../../types/emt.types'
import { BusMarkerComponent } from '../bus-marker/bus-marker.component'

@Component({
  selector: 'app-bus-markers-layer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BusMarkerComponent],
  templateUrl: './bus-markers-layer.component.html',
  styleUrl: './bus-markers-layer.component.scss',
})
export class BusMarkersLayerComponent {
  readonly zoom = input.required<number>()

  private readonly resources = inject(EMTResourcesService)
  private readonly store = inject(EMTStore)

  // Cache para evitar parpadeo cuando el recurso devuelve [] transitoriamente.
  // computed() no tiene memoria, por eso el caché necesita effect().
  private readonly _cachedBuses = signal<BusUbicacion[]>([])
  private readonly _cachedLinea = signal<string | null>(null)

  private readonly _raw = computed((): BusUbicacion[] => {
    const buses = this.resources.ubicacionesResource.value() ?? []
    const active = this.store.sentidosActivos()
    return buses.filter(bus => active.includes(bus.sentido))
  })

  readonly filteredBuses = computed((): BusUbicacion[] => {
    const linea = this.store.lineaSeleccionada()
    const raw = this._raw()
    if (raw.length > 0) return raw
    // Misma línea pero sin datos aún: devuelve el último estado conocido
    return linea === this._cachedLinea() ? this._cachedBuses() : []
  })

  constructor() {
    effect(() => {
      const linea = this.store.lineaSeleccionada()
      const buses = this._raw()
      if (buses.length > 0) {
        this._cachedLinea.set(linea)
        this._cachedBuses.set(buses)
      } else if (linea !== this._cachedLinea()) {
        // Línea nueva sin buses aún: limpia el caché para no mostrar la línea anterior
        this._cachedLinea.set(linea)
        this._cachedBuses.set([])
      }
    })
  }
}
