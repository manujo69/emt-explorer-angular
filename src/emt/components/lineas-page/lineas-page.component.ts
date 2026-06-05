import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { httpResource } from '@angular/common/http'
import type { LineaEMT } from '../../types/emt.types'

@Component({
  selector: 'app-lineas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lineas-page.component.html',
  styleUrl: './lineas-page.component.scss',
})
export class LineasPageComponent {
  readonly lineasResource = httpResource<LineaEMT[]>(() => '/api/emt/lineas')
  readonly lineaSeleccionada = signal<string | null>(null)

  readonly lineaInfo = () => {
    const cod = this.lineaSeleccionada()
    if (!cod) return null
    return this.lineasResource.value()?.find((l: LineaEMT) => l.codLinea === cod) ?? null
  }

  seleccionar(codLinea: string): void {
    this.lineaSeleccionada.set(codLinea)
  }
}
