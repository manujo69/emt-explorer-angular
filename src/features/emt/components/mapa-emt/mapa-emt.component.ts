import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core'
import { MapComponent } from '@maplibre/ngx-maplibre-gl'
import type { LngLatBoundsLike, Map as MaplibreMap } from 'maplibre-gl'
import { formatErrorMessage } from '../../../../shared/utils/format-error-message'
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component'
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import { BusMarkersLayerComponent } from '../bus-markers-layer/bus-markers-layer.component'
import { ParadaModalComponent } from '../parada-modal/parada-modal.component'
import { RutaLineaComponent } from '../ruta-linea/ruta-linea.component'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright'
const MALAGA_CENTER: [number, number] = [-4.4214, 36.7213]
const INITIAL_ZOOM: [number] = [13]

@Component({
  selector: 'app-mapa-emt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MapComponent,
    BusMarkersLayerComponent,
    RutaLineaComponent,
    ParadaModalComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
  ],
  templateUrl: './mapa-emt.component.html',
  styleUrl: './mapa-emt.component.scss',
})
export class MapaEMTComponent {
  private readonly resources = inject(EMTResourcesService)
  private readonly store = inject(EMTStore)

  protected readonly mapStyle = MAP_STYLE
  protected readonly mapCenter = MALAGA_CENTER
  protected readonly mapZoom = INITIAL_ZOOM

  private readonly mapRef = signal<MaplibreMap | null>(null)
  readonly zoom = signal<number>(INITIAL_ZOOM[0])

  private _fittedLinea: string | null = null

  private readonly mapFitBounds = computed((): LngLatBoundsLike | undefined => {
    const paradas = this.resources.paradasResource.value()
    if (!paradas?.length) return undefined
    const lngs = paradas.map(p => p.longitud)
    const lats = paradas.map(p => p.latitud)
    return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
  })

  private readonly buses = computed(() => this.resources.ubicacionesResource.value() ?? [])

  readonly isFirstLoad = computed(
    () =>
      this.store.lineaSeleccionada() !== null &&
      this.resources.ubicacionesResource.isLoading() &&
      this.buses().length === 0 &&
      !this.resources.ubicacionesResource.error(),
  )

  readonly isRefreshing = computed(
    () => this.resources.ubicacionesResource.isLoading() && this.buses().length > 0,
  )

  readonly hasError = computed(
    () =>
      !!this.resources.ubicacionesResource.error() &&
      !this.resources.ubicacionesResource.isLoading(),
  )

  readonly errorMsg = computed(() => formatErrorMessage(this.resources.ubicacionesResource.error()))

  constructor() {
    effect(() => {
      const linea = this.store.lineaSeleccionada()
      const bounds = this.mapFitBounds()
      const map = this.mapRef()
      if (!linea || !bounds || !map) return
      if (this._fittedLinea === linea) return

      const cameraOpts = map.cameraForBounds(bounds, { padding: 40 })
      if (cameraOpts) map.jumpTo(cameraOpts)
      this._fittedLinea = linea
    })
  }

  onMapLoad(map: MaplibreMap): void {
    this.mapRef.set(map)
    this.applyStyleCustomizations(map)
  }

  onZoomEnd(): void {
    const map = this.mapRef()
    if (map) this.zoom.set(map.getZoom())
  }

  retryUbicaciones(): void {
    this.resources.ubicacionesResource.reload()
  }

  private applyStyleCustomizations(map: MaplibreMap): void {
    // Hide 3D building extrusions for a cleaner transit map view
    const threeDLayers = ['building-3d', 'building_3d', 'buildings-3d']
    for (const id of threeDLayers) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none')
      }
    }

    // Reduce visual noise from tourist/recreational POI labels
    // Uses ['match'] instead of ['in'] to handle null subclass values gracefully
    const excludedSubclasses = ['hotel', 'attraction', 'museum', 'zoo', 'theme_park', 'stadium', 'cinema', 'theatre']
    const poiLayers = ['poi-level-1', 'poi-level-2', 'poi-level-3', 'poi']
    for (const id of poiLayers) {
      if (map.getLayer(id)) {
        try {
          map.setFilter(id, [
            'match',
            ['coalesce', ['get', 'subclass'], ''],
            excludedSubclasses,
            false,
            true,
          ])
        } catch {
          // Layer may not support this filter expression — skip
        }
      }
    }
  }
}
