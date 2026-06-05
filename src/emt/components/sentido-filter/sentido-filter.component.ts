import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import { isCircular } from '../../utils/is-circular'
import { getSentidoColor } from '../../utils/linea-colors'

@Component({
  selector: 'app-sentido-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sentido-filter.component.html',
  styleUrl: './sentido-filter.component.scss',
})
export class SentidoFilterComponent {
  private readonly resources = inject(EMTResourcesService)
  private readonly store = inject(EMTStore)

  private readonly lineaSeleccionada = computed(() => this.store.lineaSeleccionada())
  private readonly lineas = computed(() => this.resources.lineasResource.value() ?? [])
  private readonly lineaInfo = computed(() => {
    const cod = this.lineaSeleccionada()
    return this.lineas().find(l => l.codLinea === cod) ?? null
  })

  readonly shouldShow = computed(() => {
    const linea = this.lineaInfo()
    if (!linea) return false
    if (isCircular(linea.nombreLinea)) return false
    return !!(linea.cabeceraIda && linea.cabeceraVuelta)
  })

  private readonly sentidosActivos = computed(() => this.store.sentidosActivos())

  isActive(sentido: number): boolean {
    return this.sentidosActivos().includes(sentido)
  }

  label(sentido: number): string {
    const linea = this.lineaInfo()
    if (!linea) return `Sentido ${sentido}`
    return sentido === 1 ? (linea.cabeceraIda ?? `Sentido 1`) : (linea.cabeceraVuelta ?? `Sentido 2`)
  }

  trackColor(sentido: number): string {
    const linea = this.lineaSeleccionada()
    return linea ? getSentidoColor(linea, sentido) : '#4b5563'
  }

  toggle(sentido: number): void {
    this.store.toggleSentido(sentido)
  }
}
