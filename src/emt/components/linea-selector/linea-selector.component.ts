import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import type { LineaEMT } from '../../types/emt.types'
import { getLineaLabel } from '../../utils/linea-colors'

@Component({
  selector: 'app-linea-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './linea-selector.component.html',
  styleUrl: './linea-selector.component.scss',
})
export class LineaSelectorComponent {
  private readonly resources = inject(EMTResourcesService)
  private readonly store = inject(EMTStore)

  readonly isLoading = computed(() => this.resources.lineasResource.isLoading())
  readonly hasError = computed(() => !!this.resources.lineasResource.error() && !this.isLoading())
  readonly lineas = computed(() => this.resources.lineasResource.value() ?? [])
  readonly lineaSeleccionada = computed(() => this.store.lineaSeleccionada())

  optionLabel(linea: LineaEMT): string {
    return `${getLineaLabel(linea)} — ${linea.nombreLinea}`
  }

  onSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value
    this.store.setLineaSeleccionada(value || null)
  }
}
