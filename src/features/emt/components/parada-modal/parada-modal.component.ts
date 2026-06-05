import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { PopupComponent } from '@maplibre/ngx-maplibre-gl'
import { formatErrorMessage } from '../../../../shared/utils/format-error-message'
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import type { LlegadaLinea } from '../../types/emt.types'
import { getLineaColor, getTextColor } from '../../utils/linea-colors'
import { isCircular } from '../../utils/is-circular'

function formatMinutos(minutos: number): string {
  if (minutos <= 0) return 'Ahora'
  if (minutos === 1) return '1 min'
  return `${minutos} min`
}

function destinoLabel(llegada: LlegadaLinea): string {
  if (llegada.destino) return llegada.destino
  return isCircular(llegada.nombreLinea) ? 'Servicio circular' : llegada.nombreLinea
}

@Component({
  selector: 'app-parada-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PopupComponent, LoadingSpinnerComponent],
  templateUrl: './parada-modal.component.html',
  styleUrl: './parada-modal.component.scss',
})
export class ParadaModalComponent {
  private readonly resources = inject(EMTResourcesService)
  private readonly store = inject(EMTStore)

  private readonly paradaCod = computed(() => this.store.paradaSeleccionada())
  private readonly paradas = computed(() => this.resources.paradasResource.value() ?? [])
  private readonly lineaSeleccionada = computed(() => this.store.lineaSeleccionada())

  private readonly paradaInfo = computed(() => {
    const cod = this.paradaCod()
    if (!cod) return null
    return this.paradas().find(p => p.codParada === cod) ?? null
  })

  readonly show = computed(() => !!this.paradaInfo())
  readonly paradaNombre = computed(() => this.paradaInfo()?.nombreParada ?? '')
  readonly lngLat = computed<[number, number]>(() => {
    const p = this.paradaInfo()
    return p ? [p.longitud, p.latitud] : [0, 0]
  })

  readonly isLoading = computed(() => this.resources.llegadasResource.isLoading())
  readonly hasError = computed(() => !!this.resources.llegadasResource.error() && !this.isLoading())
  readonly errorMsg = computed(() => formatErrorMessage(this.resources.llegadasResource.error()))

  readonly llegadas = computed(() => this.resources.llegadasResource.value() ?? [])

  readonly primaryLlegadas = computed(() => {
    const linea = this.lineaSeleccionada()
    return this.llegadas().filter(l => l.codLinea === linea)
  })

  readonly restLlegadas = computed(() => {
    const linea = this.lineaSeleccionada()
    return this.llegadas().filter(l => l.codLinea !== linea)
  })

  badgeColor(codLinea: string): string {
    return getLineaColor(codLinea)
  }

  badgeText(codLinea: string): string {
    return getTextColor(getLineaColor(codLinea))
  }

  destino(llegada: LlegadaLinea): string {
    return destinoLabel(llegada)
  }

  minutos(llegada: LlegadaLinea): string {
    return formatMinutos(llegada.proximoBus.minutos)
  }

  close(): void {
    this.store.setParadaSeleccionada(null)
  }
}
