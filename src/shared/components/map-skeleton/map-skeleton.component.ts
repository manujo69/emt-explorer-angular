import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'app-map-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map-skeleton.component.html',
  styleUrl: './map-skeleton.component.scss',
})
export class MapSkeletonComponent {}
