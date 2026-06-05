import { render, screen, fireEvent } from '@testing-library/angular'
import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { RutaLineaComponent } from './ruta-linea.component'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import type { ParadaEMT, ShapesByDirection } from '../../types/emt.types'

const PARADA_S1: ParadaEMT = { codLinea: '1', codParada: 'P1', nombreParada: 'Parada Norte', sentido: 1, orden: 1, longitud: -4.42, latitud: 36.72 }
const PARADA_S2: ParadaEMT = { codLinea: '1', codParada: 'P2', nombreParada: 'Parada Sur', sentido: 2, orden: 1, longitud: -4.43, latitud: 36.73 }
const PARADA_S1_B: ParadaEMT = { codLinea: '1', codParada: 'P3', nombreParada: 'Parada Norte 2', sentido: 1, orden: 2, longitud: -4.44, latitud: 36.74 }

function buildMockResources(paradas: ParadaEMT[] = [], shapes: ShapesByDirection = {}) {
  const noRes = { value: signal<unknown>(undefined), isLoading: signal(false), error: signal<unknown>(undefined), reload: jest.fn() }
  return {
    paradasResource: { value: signal<ParadaEMT[] | undefined>(paradas), isLoading: signal(false), error: signal<unknown>(undefined), reload: jest.fn() },
    shapesResource: { value: signal<ShapesByDirection | undefined>(shapes), isLoading: signal(false), error: signal<unknown>(undefined), reload: jest.fn() },
    lineasResource: noRes,
    ubicacionesResource: noRes,
    llegadasResource: noRes,
  }
}

// Paradas must be set AFTER the linea to avoid getSentidoColor('') crash in sentidoColors computed.
async function renderWithParadas(paradas: ParadaEMT[]) {
  const mockResources = buildMockResources()
  const { fixture } = await render(RutaLineaComponent, {
    providers: [{ provide: EMTResourcesService, useValue: mockResources }],
  })
  const store = TestBed.inject(EMTStore)
  store.setLineaSeleccionada('1')
  mockResources.paradasResource.value.set(paradas)
  fixture.detectChanges()
  return { fixture, store, mockResources }
}

describe('RutaLineaComponent', () => {
  it('visibleParadas includes stops from all active sentidos', async () => {
    const { fixture } = await renderWithParadas([PARADA_S1, PARADA_S2])
    expect(fixture.componentInstance.visibleParadas()).toHaveLength(2)
  })

  it('visibleParadas excludes stops of an inactive sentido', async () => {
    const { fixture, store } = await renderWithParadas([PARADA_S1, PARADA_S2])
    store.toggleSentido(2)
    const visible = fixture.componentInstance.visibleParadas()
    expect(visible).toHaveLength(1)
    expect(visible[0].codParada).toBe('P1')
  })

  it('clicking a stop button calls setParadaSeleccionada', async () => {
    await renderWithParadas([PARADA_S1, PARADA_S1_B])
    fireEvent.click(screen.getByRole('button', { name: 'Parada Parada Norte' }))
    expect(TestBed.inject(EMTStore).paradaSeleccionada()).toBe('P1')
  })

  it('featureS1 is null when fewer than 2 sentido-1 paradas exist', async () => {
    const { fixture } = await renderWithParadas([PARADA_S1])
    expect(fixture.componentInstance.featureS1()).toBeNull()
  })

  it('featureS1 is a FeatureCollection when there are ≥ 2 sentido-1 paradas', async () => {
    const { fixture } = await renderWithParadas([PARADA_S1, PARADA_S1_B])
    const feature = fixture.componentInstance.featureS1()
    expect(feature?.type).toBe('FeatureCollection')
    expect(feature?.features[0].geometry.type).toBe('LineString')
  })

  it('featureS2 is null when no sentido-2 paradas exist', async () => {
    const { fixture } = await renderWithParadas([PARADA_S1, PARADA_S1_B])
    expect(fixture.componentInstance.featureS2()).toBeNull()
  })
})
