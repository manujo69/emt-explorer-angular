import { Directive, OnDestroy, OnInit, inject, output } from '@angular/core'
import { MapComponent } from '@maplibre/ngx-maplibre-gl'
import type { Map as MaplibreMap } from 'maplibre-gl'
import { Subscription } from 'rxjs'

@Directive({
  selector: 'mgl-map[appMapShell]',
  standalone: true,
})
export class MapShellDirective implements OnInit, OnDestroy {
  private readonly mapComp = inject(MapComponent)
  readonly mapZoom = output<number>()

  private mapRef: MaplibreMap | null = null
  private readonly sub = new Subscription()

  ngOnInit(): void {
    this.sub.add(
      this.mapComp.mapLoad.subscribe((map: MaplibreMap) => {
        this.mapRef = map
        this.applyStyleCustomizations(map)
      }),
    )
    this.sub.add(
      this.mapComp.zoomEnd.subscribe(() => {
        if (this.mapRef) this.mapZoom.emit(this.mapRef.getZoom())
      }),
    )
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe()
  }

  private applyStyleCustomizations(map: MaplibreMap): void {
    const threeDLayers = ['building-3d', 'building_3d', 'buildings-3d']
    for (const id of threeDLayers) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none')
      }
    }

    const excludedSubclasses = [
      'hotel', 'attraction', 'museum', 'zoo', 'theme_park', 'stadium', 'cinema', 'theatre',
    ]
    const poiLayers = ['poi-level-1', 'poi-level-2', 'poi-level-3', 'poi']
    for (const id of poiLayers) {
      if (map.getLayer(id)) {
        try {
          map.setFilter(id, ['match', ['coalesce', ['get', 'subclass'], ''], excludedSubclasses, false, true])
        } catch {
          // Layer may not support this filter expression — skip
        }
      }
    }
  }
}
