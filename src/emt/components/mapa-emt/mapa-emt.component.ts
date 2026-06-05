import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core'
import { formatErrorMessage } from '../../../shared/utils/format-error-message'
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component'
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component'
import { MapComponent } from '@maplibre/ngx-maplibre-gl'
import { MapShellDirective } from '../../../shared/directives/map-shell.directive'
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
    MapShellDirective,
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

  readonly zoom = signal<number>(INITIAL_ZOOM[0])

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

  retryUbicaciones(): void {
    this.resources.ubicacionesResource.reload()
  }
}
