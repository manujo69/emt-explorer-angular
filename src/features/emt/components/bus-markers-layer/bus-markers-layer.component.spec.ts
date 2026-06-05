import { render } from '@testing-library/angular'
import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { BusMarkersLayerComponent } from './bus-markers-layer.component'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import type { BusUbicacion } from '../../types/emt.types'

const BUS_S1: BusUbicacion = { codBus: 'B1', codLinea: '1', sentido: 1, longitud: -4.42, latitud: 36.72, codParIni: '1', lastUpdate: '' }
const BUS_S2: BusUbicacion = { codBus: 'B2', codLinea: '1', sentido: 2, longitud: -4.43, latitud: 36.73, codParIni: '2', lastUpdate: '' }

function buildMockResources(buses: BusUbicacion[] = []) {
  const noRes = { value: signal<unknown>(undefined), isLoading: signal(false), error: signal<unknown>(undefined), reload: jest.fn() }
  return {
    ubicacionesResource: { value: signal<BusUbicacion[] | undefined>(buses), isLoading: signal(false), error: signal<unknown>(undefined), reload: jest.fn() },
    lineasResource: noRes,
    paradasResource: noRes,
    shapesResource: noRes,
    llegadasResource: noRes,
  }
}

describe('BusMarkersLayerComponent', () => {
  it('shows all buses when both sentidos are active', async () => {
    const mockResources = buildMockResources([BUS_S1, BUS_S2])
    const { fixture } = await render(BusMarkersLayerComponent, {
      inputs: { zoom: 14 },
      providers: [{ provide: EMTResourcesService, useValue: mockResources }],
    })
    TestBed.inject(EMTStore).setLineaSeleccionada('1')
    TestBed.flushEffects()
    expect(fixture.componentInstance.filteredBuses()).toHaveLength(2)
  })

  it('filters out buses of an inactive sentido', async () => {
    const mockResources = buildMockResources([BUS_S1, BUS_S2])
    const { fixture } = await render(BusMarkersLayerComponent, {
      inputs: { zoom: 14 },
      providers: [{ provide: EMTResourcesService, useValue: mockResources }],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('1')
    TestBed.flushEffects()
    store.toggleSentido(2)
    expect(fixture.componentInstance.filteredBuses()).toHaveLength(1)
    expect(fixture.componentInstance.filteredBuses()[0].codBus).toBe('B1')
  })

  it('returns cached buses when resource temporarily returns empty (same linea)', async () => {
    const mockResources = buildMockResources([BUS_S1])
    const { fixture } = await render(BusMarkersLayerComponent, {
      inputs: { zoom: 14 },
      providers: [{ provide: EMTResourcesService, useValue: mockResources }],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('1')
    TestBed.flushEffects()

    // Resource momentarily returns empty (simulating poll cycle)
    mockResources.ubicacionesResource.value.set([])
    TestBed.flushEffects()

    // Should keep showing the cached bus
    expect(fixture.componentInstance.filteredBuses()).toHaveLength(1)
    expect(fixture.componentInstance.filteredBuses()[0].codBus).toBe('B1')
  })

  it('clears cache when the selected line changes', async () => {
    const mockResources = buildMockResources([BUS_S1])
    const { fixture } = await render(BusMarkersLayerComponent, {
      inputs: { zoom: 14 },
      providers: [{ provide: EMTResourcesService, useValue: mockResources }],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('1')
    TestBed.flushEffects()

    // Switch to a different line (no buses yet)
    mockResources.ubicacionesResource.value.set([])
    store.setLineaSeleccionada('2')
    TestBed.flushEffects()

    expect(fixture.componentInstance.filteredBuses()).toHaveLength(0)
  })
})
