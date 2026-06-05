import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core'
import { MapService } from '@maplibre/ngx-maplibre-gl'
import type { LngLatBoundsLike } from 'maplibre-gl'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import type { ParadaEMT } from '../../types/emt.types'

function computeBounds(paradas: ParadaEMT[]): LngLatBoundsLike {
  const lngs = paradas.map(p => p.longitud)
  const lats = paradas.map(p => p.latitud)
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

@Component({
  selector: 'app-map-camera-controller',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map-camera-controller.component.html',
  styleUrl: './map-camera-controller.component.scss',
})
export class MapCameraControllerComponent {
  private readonly mapService = inject(MapService)
  private readonly resources = inject(EMTResourcesService)
  private readonly store = inject(EMTStore)

  private readonly fittedLinea = signal<string | null>(null)

  constructor() {
    effect(() => {
      const linea = this.store.lineaSeleccionada()
      const paradas = this.resources.paradasResource.value()

      if (!linea || !paradas?.length) return
      if (untracked(() => this.fittedLinea()) === linea) return

      const bounds = computeBounds(paradas)
      try {
        this.mapService.fitBounds(bounds, { padding: 40 })
        untracked(() => this.fittedLinea.set(linea))
      } catch {
        // Map not yet initialized — retry on next paradas change
      }
    })
  }
}
