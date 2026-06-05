import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { MapSkeletonComponent } from '../shared/components/map-skeleton/map-skeleton.component'
import { LineaSelectorComponent } from '../features/emt/components/linea-selector/linea-selector.component'
import { SentidoFilterComponent } from '../features/emt/components/sentido-filter/sentido-filter.component'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LineaSelectorComponent, SentidoFilterComponent, MapSkeletonComponent],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly routeReady = signal(false)
}
