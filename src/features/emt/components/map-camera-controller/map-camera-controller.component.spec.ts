import { render } from '@testing-library/angular'
import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { MapCameraControllerComponent } from './map-camera-controller.component'
import { MapService } from '@maplibre/ngx-maplibre-gl'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import type { ParadaEMT } from '../../types/emt.types'

const PARADAS: ParadaEMT[] = [
  { codLinea: '1', codParada: 'P1', nombreParada: 'A', sentido: 1, orden: 1, longitud: -4.42, latitud: 36.72 },
  { codLinea: '1', codParada: 'P2', nombreParada: 'B', sentido: 1, orden: 2, longitud: -4.50, latitud: 36.80 },
]

function buildMockResources(paradas?: ParadaEMT[]) {
  const noRes = { value: signal<unknown>(undefined), isLoading: signal(false), error: signal<unknown>(undefined), reload: jest.fn() }
  return {
    paradasResource: { value: signal<ParadaEMT[] | undefined>(paradas), isLoading: signal(false), error: signal<unknown>(undefined), reload: jest.fn() },
    lineasResource: noRes,
    ubicacionesResource: noRes,
    shapesResource: noRes,
    llegadasResource: noRes,
  }
}

describe('MapCameraControllerComponent', () => {
  it('calls fitBounds when a line with paradas is selected', async () => {
    const mockMapService = new MapService()
    const mockResources = buildMockResources(PARADAS)
    await render(MapCameraControllerComponent, {
      providers: [
        { provide: MapService, useValue: mockMapService },
        { provide: EMTResourcesService, useValue: mockResources },
      ],
    })
    TestBed.inject(EMTStore).setLineaSeleccionada('1')
    TestBed.flushEffects()
    expect(mockMapService.fitBounds).toHaveBeenCalledTimes(1)
    const bounds = mockMapService.fitBounds.mock.calls[0][0] as [[number, number], [number, number]]
    expect(bounds[0][0]).toBeCloseTo(-4.50) // min lng
    expect(bounds[1][0]).toBeCloseTo(-4.42) // max lng
  })

  it('does not call fitBounds again for the same line', async () => {
    const mockMapService = new MapService()
    const mockResources = buildMockResources(PARADAS)
    await render(MapCameraControllerComponent, {
      providers: [
        { provide: MapService, useValue: mockMapService },
        { provide: EMTResourcesService, useValue: mockResources },
      ],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('1')
    TestBed.flushEffects()
    // Trigger effect again with the same line (simulating a paradas poll update)
    mockResources.paradasResource.value.set([...PARADAS])
    TestBed.flushEffects()
    expect(mockMapService.fitBounds).toHaveBeenCalledTimes(1)
  })

  it('calls fitBounds again when the line changes', async () => {
    const mockMapService = new MapService()
    const mockResources = buildMockResources(PARADAS)
    await render(MapCameraControllerComponent, {
      providers: [
        { provide: MapService, useValue: mockMapService },
        { provide: EMTResourcesService, useValue: mockResources },
      ],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('1')
    TestBed.flushEffects()
    store.setLineaSeleccionada('2')
    TestBed.flushEffects()
    expect(mockMapService.fitBounds).toHaveBeenCalledTimes(2)
  })

  it('does not call fitBounds when paradas are empty', async () => {
    const mockMapService = new MapService()
    const mockResources = buildMockResources([])
    await render(MapCameraControllerComponent, {
      providers: [
        { provide: MapService, useValue: mockMapService },
        { provide: EMTResourcesService, useValue: mockResources },
      ],
    })
    TestBed.inject(EMTStore).setLineaSeleccionada('1')
    TestBed.flushEffects()
    expect(mockMapService.fitBounds).not.toHaveBeenCalled()
  })
})
