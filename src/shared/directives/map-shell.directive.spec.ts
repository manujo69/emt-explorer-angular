import { Component } from '@angular/core'
import { By } from '@angular/platform-browser'
import { render } from '@testing-library/angular'
import { MapComponent } from '@maplibre/ngx-maplibre-gl'
import type { Map as MaplibreMap } from 'maplibre-gl'
import { MapShellDirective } from './map-shell.directive'

@Component({
  standalone: true,
  imports: [MapComponent, MapShellDirective],
  template: `<mgl-map appMapShell (mapZoom)="onZoom($event)"></mgl-map>`,
})
class TestHostComponent {
  readonly zooms: number[] = []
  onZoom(z: number): void {
    this.zooms.push(z)
  }
}

function getFakeMap(zoom = 14): MaplibreMap {
  return { getZoom: () => zoom, getLayer: () => null } as unknown as MaplibreMap
}

describe('MapShellDirective', () => {
  async function setup() {
    const { fixture } = await render(TestHostComponent)
    const mapEl = fixture.debugElement.query(By.directive(MapComponent))
    const mapComp = mapEl.injector.get(MapComponent)
    return { fixture, mapComp }
  }

  it('emits mapZoom after mapLoad and zoomEnd fire', async () => {
    const { fixture, mapComp } = await setup()

    mapComp.mapLoad.emit(getFakeMap(14))
    mapComp.zoomEnd.emit()

    expect(fixture.componentInstance.zooms).toEqual([14])
  })

  it('does not emit mapZoom before mapLoad fires', async () => {
    const { fixture, mapComp } = await setup()

    mapComp.zoomEnd.emit()

    expect(fixture.componentInstance.zooms).toHaveLength(0)
  })

  it('emits the zoom from map.getZoom()', async () => {
    const { fixture, mapComp } = await setup()

    mapComp.mapLoad.emit(getFakeMap(17))
    mapComp.zoomEnd.emit()

    expect(fixture.componentInstance.zooms[0]).toBe(17)
  })
})
