import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
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

  // Plain properties (not signals) avoid effect() + signal writes inside tick()
  private _cachedBuses: BusUbicacion[] = []
  private _cachedLinea: string | null = null

  private readonly _raw = computed((): BusUbicacion[] => {
    const buses = this.resources.ubicacionesResource.value() ?? []
    const active = this.store.sentidosActivos()
    return buses.filter(bus => active.includes(bus.sentido))
  })

  readonly filteredBuses = computed((): BusUbicacion[] => {
    const linea = this.store.lineaSeleccionada()
    const raw = this._raw()
    if (raw.length > 0) {
      this._cachedLinea = linea
      this._cachedBuses = raw
      return raw
    }
    if (linea !== this._cachedLinea) {
      this._cachedLinea = linea
      this._cachedBuses = []
    }
    return this._cachedBuses
  })
}
