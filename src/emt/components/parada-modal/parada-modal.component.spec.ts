import { render, screen, fireEvent } from '@testing-library/angular'
import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { ParadaModalComponent } from './parada-modal.component'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import type { LlegadaLinea, ParadaEMT } from '../../types/emt.types'

const PARADA: ParadaEMT = { codLinea: '1', codParada: 'P1', nombreParada: 'Centro', sentido: 1, orden: 1, longitud: -4.42, latitud: 36.72 }

const LLEGADA_PRIMARY: LlegadaLinea = { codLinea: '1', nombreLinea: 'Línea 1', sentido: 1, destino: 'Norte', proximoBus: { codBus: 'B1', minutos: 3 } }
const LLEGADA_REST: LlegadaLinea = { codLinea: '2', nombreLinea: 'Línea 2', sentido: 1, destino: 'Sur', proximoBus: { codBus: 'B2', minutos: 0 } }
const LLEGADA_CIRCULAR: LlegadaLinea = { codLinea: '3', nombreLinea: 'Circular Norte', sentido: 1, destino: '', proximoBus: { codBus: 'B3', minutos: 1 } }
const LLEGADA_NO_DESTINO: LlegadaLinea = { codLinea: '4', nombreLinea: 'Línea 4', sentido: 1, destino: '', proximoBus: { codBus: 'B4', minutos: 5 } }

function buildMockResources(options: {
  paradas?: ParadaEMT[]
  llegadas?: LlegadaLinea[]
  loadingLlegadas?: boolean
  errorLlegadas?: unknown
} = {}) {
  const noRes = { value: signal<unknown>(undefined), isLoading: signal(false), error: signal<unknown>(undefined), reload: jest.fn() }
  return {
    paradasResource: { value: signal<ParadaEMT[] | undefined>(options.paradas ?? [PARADA]), isLoading: signal(false), error: signal<unknown>(undefined), reload: jest.fn() },
    llegadasResource: {
      value: signal<LlegadaLinea[] | undefined>(options.llegadas),
      isLoading: signal(options.loadingLlegadas ?? false),
      error: signal<unknown>(options.errorLlegadas),
      reload: jest.fn(),
    },
    lineasResource: noRes,
    ubicacionesResource: noRes,
    shapesResource: noRes,
  }
}

describe('ParadaModalComponent', () => {
  it('renders nothing when no parada is selected', async () => {
    const { container } = await render(ParadaModalComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources() }],
    })
    expect(container.querySelector('mgl-popup')).toBeNull()
  })

  it('shows the parada name when a parada is selected', async () => {
    const { fixture } = await render(ParadaModalComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources({ llegadas: [] }) }],
    })
    TestBed.inject(EMTStore).setParadaSeleccionada('P1')
    fixture.detectChanges()
    expect(screen.getByText('Centro')).toBeInTheDocument()
  })

  it('shows a loading spinner while llegadas are loading', async () => {
    const { fixture } = await render(ParadaModalComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources({ loadingLlegadas: true }) }],
    })
    TestBed.inject(EMTStore).setParadaSeleccionada('P1')
    fixture.detectChanges()
    expect(screen.getByRole('status', { name: /Cargando llegadas/i })).toBeInTheDocument()
  })

  it('shows empty message when no buses are en route', async () => {
    const { fixture } = await render(ParadaModalComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources({ llegadas: [] }) }],
    })
    TestBed.inject(EMTStore).setParadaSeleccionada('P1')
    fixture.detectChanges()
    expect(screen.getByText('No hay buses en camino')).toBeInTheDocument()
  })

  it('shows primary llegadas before rest llegadas', async () => {
    const { fixture } = await render(ParadaModalComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources({ llegadas: [LLEGADA_PRIMARY, LLEGADA_REST] }) }],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('1')
    store.setParadaSeleccionada('P1')
    fixture.detectChanges()
    const items = screen.getAllByRole('listitem')
    expect(items[0].textContent).toContain('Norte')
    expect(items[0].textContent).toContain('3 min')
  })

  it('formats minutos: 0 → Ahora, 1 → 1 min, N → N min', async () => {
    const { fixture } = await render(ParadaModalComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources({ llegadas: [LLEGADA_REST, LLEGADA_CIRCULAR, LLEGADA_NO_DESTINO] }) }],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('99')
    store.setParadaSeleccionada('P1')
    fixture.detectChanges()
    expect(screen.getByText('Ahora')).toBeInTheDocument()
    expect(screen.getByText('1 min')).toBeInTheDocument()
    expect(screen.getByText('5 min')).toBeInTheDocument()
  })

  it('uses destino field when available', async () => {
    const { fixture } = await render(ParadaModalComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources({ llegadas: [LLEGADA_PRIMARY] }) }],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('99')
    store.setParadaSeleccionada('P1')
    fixture.detectChanges()
    expect(screen.getByText('Norte')).toBeInTheDocument()
  })

  it('shows "Servicio circular" for circular lines without destino', async () => {
    const { fixture } = await render(ParadaModalComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources({ llegadas: [LLEGADA_CIRCULAR] }) }],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('99')
    store.setParadaSeleccionada('P1')
    fixture.detectChanges()
    expect(screen.getByText('Servicio circular')).toBeInTheDocument()
  })

  it('falls back to nombreLinea when no destino and not circular', async () => {
    const { fixture } = await render(ParadaModalComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources({ llegadas: [LLEGADA_NO_DESTINO] }) }],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('99')
    store.setParadaSeleccionada('P1')
    fixture.detectChanges()
    expect(screen.getByText('Línea 4')).toBeInTheDocument()
  })

  it('calls setParadaSeleccionada(null) when close button is clicked', async () => {
    const { fixture } = await render(ParadaModalComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources({ llegadas: [] }) }],
    })
    const store = TestBed.inject(EMTStore)
    store.setParadaSeleccionada('P1')
    fixture.detectChanges()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(store.paradaSeleccionada()).toBeNull()
  })
})
