import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { MarkerComponent } from '@maplibre/ngx-maplibre-gl'
import type { BusUbicacion } from '../../types/emt.types'
import { getSentidoColor, getTextColor } from '../../utils/linea-colors'

@Component({
  selector: 'app-bus-marker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkerComponent],
  templateUrl: './bus-marker.component.html',
  styleUrl: './bus-marker.component.scss',
})
export class BusMarkerComponent {
  readonly bus = input.required<BusUbicacion>()
  readonly zoom = input.required<number>()

  readonly lngLat = computed<[number, number]>(() => [this.bus().longitud, this.bus().latitud])

  // Linear interpolation: 12 px at z≤13, 32 px at z≥16
  readonly size = computed(() => {
    const z = this.zoom()
    if (z <= 13) return 12
    if (z >= 16) return 32
    return Math.round(12 + ((z - 13) / 3) * 20)
  })

  readonly fillColor = computed(() => getSentidoColor(this.bus().codLinea, this.bus().sentido))
  readonly textColor = computed(() => getTextColor(this.fillColor()))
  readonly title = computed(() => `Línea ${this.bus().codLinea} — sentido ${this.bus().sentido}`)
}
