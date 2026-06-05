import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { GeoJSONSourceComponent, LayerComponent, MarkerComponent } from '@maplibre/ngx-maplibre-gl'
import type { FeatureCollection, LineString } from 'geojson'
import { catmullRomSmooth } from '../../../../shared/utils/catmull-rom-smooth'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import type { ParadaEMT, ShapePoint } from '../../types/emt.types'
import { getSentidoColor } from '../../utils/linea-colors'

const LINE_LAYOUT = { 'line-join': 'round', 'line-cap': 'round' } as const

function buildFeature(
  paradas: ParadaEMT[],
  shape: ShapePoint[] | undefined,
): FeatureCollection<LineString> | null {
  if (paradas.length < 2) return null
  const raw = shape?.length
    ? shape.map(p => ({ lat: p.latitud, lng: p.longitud }))
    : paradas.map(p => ({ lat: p.latitud, lng: p.longitud }))
  const factor = shape?.length ? 4 : 8
  const coords = catmullRomSmooth(raw, factor)
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords.map(c => [c.lng, c.lat]) },
        properties: {},
      },
    ],
  }
}

@Component({
  selector: 'app-ruta-linea',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GeoJSONSourceComponent, LayerComponent, MarkerComponent],
  templateUrl: './ruta-linea.component.html',
  styleUrl: './ruta-linea.component.scss',
})
export class RutaLineaComponent {
  private readonly resources = inject(EMTResourcesService)
  private readonly store = inject(EMTStore)

  protected readonly lineLayout = LINE_LAYOUT

  private readonly paradas = computed(() => this.resources.paradasResource.value() ?? [])
  private readonly shapes = computed(() => this.resources.shapesResource.value() ?? {})
  private readonly linea = computed(() => this.store.lineaSeleccionada() ?? '')
  private readonly sentidosActivos = computed(() => this.store.sentidosActivos())

  readonly featureS1 = computed(() =>
    buildFeature(
      this.paradas().filter(p => p.sentido === 1),
      this.shapes()[1],
    ),
  )

  readonly featureS2 = computed(() =>
    buildFeature(
      this.paradas().filter(p => p.sentido === 2),
      this.shapes()[2],
    ),
  )

  readonly showS1 = computed(() => this.sentidosActivos().includes(1))
  readonly showS2 = computed(() => this.sentidosActivos().includes(2))

  readonly paintS1 = computed(() => ({
    'line-color': getSentidoColor(this.linea(), 1),
    'line-width': 6,
    'line-opacity': 0.7,
  }))

  readonly paintS2 = computed(() => ({
    'line-color': getSentidoColor(this.linea(), 2),
    'line-width': 6,
    'line-opacity': 0.7,
  }))

  readonly sentidoColors = computed((): Record<number, string> => ({
    1: getSentidoColor(this.linea(), 1),
    2: getSentidoColor(this.linea(), 2),
  }))

  readonly visibleParadas = computed((): ParadaEMT[] => {
    const active = this.sentidosActivos()
    return this.paradas().filter(p => active.includes(p.sentido))
  })

  selectParada(codParada: string): void {
    this.store.setParadaSeleccionada(codParada)
  }
}
