import { render, screen, fireEvent } from '@testing-library/angular'
import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { MapaEMTComponent } from './mapa-emt.component'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import type { BusUbicacion } from '../../types/emt.types'

const BUS: BusUbicacion = { codBus: 'B1', codLinea: '1', sentido: 1, longitud: -4.42, latitud: 36.72, codParIni: '1', lastUpdate: '' }

function buildMockResources(options: {
  buses?: BusUbicacion[]
  busesLoading?: boolean
  busesError?: unknown
} = {}) {
  const noRes = { value: signal<unknown>(undefined), isLoading: signal(false), error: signal<unknown>(undefined), reload: jest.fn() }
  const ubicacionesResource = {
    value: signal<BusUbicacion[] | undefined>(options.buses),
    isLoading: signal(options.busesLoading ?? false),
    error: signal<unknown>(options.busesError),
    reload: jest.fn(),
  }
  return { ubicacionesResource, lineasResource: noRes, paradasResource: noRes, shapesResource: noRes, llegadasResource: noRes }
}

describe('MapaEMTComponent', () => {
  it('isFirstLoad is true when a line is selected, loading and no buses yet', async () => {
    const mockResources = buildMockResources({ busesLoading: true })
    const { fixture } = await render(MapaEMTComponent, {
      providers: [{ provide: EMTResourcesService, useValue: mockResources }],
    })
    TestBed.inject(EMTStore).setLineaSeleccionada('1')
    expect(fixture.componentInstance.isFirstLoad()).toBe(true)
  })

  it('isFirstLoad is false when there are buses already', async () => {
    const mockResources = buildMockResources({ buses: [BUS], busesLoading: true })
    const { fixture } = await render(MapaEMTComponent, {
      providers: [{ provide: EMTResourcesService, useValue: mockResources }],
    })
    TestBed.inject(EMTStore).setLineaSeleccionada('1')
    expect(fixture.componentInstance.isFirstLoad()).toBe(false)
  })

  it('isRefreshing is true when loading with existing buses', async () => {
    const mockResources = buildMockResources({ buses: [BUS], busesLoading: true })
    const { fixture } = await render(MapaEMTComponent, {
      providers: [{ provide: EMTResourcesService, useValue: mockResources }],
    })
    expect(fixture.componentInstance.isRefreshing()).toBe(true)
  })

  it('hasError is true when there is an error and not loading', async () => {
    const mockResources = buildMockResources({ busesError: new Error('timeout') })
    const { fixture } = await render(MapaEMTComponent, {
      providers: [{ provide: EMTResourcesService, useValue: mockResources }],
    })
    expect(fixture.componentInstance.hasError()).toBe(true)
  })

  it('hasError is false when loading despite having an error', async () => {
    const mockResources = buildMockResources({ busesError: new Error('timeout'), busesLoading: true })
    const { fixture } = await render(MapaEMTComponent, {
      providers: [{ provide: EMTResourcesService, useValue: mockResources }],
    })
    expect(fixture.componentInstance.hasError()).toBe(false)
  })

  it('shows loading spinner when isFirstLoad', async () => {
    const mockResources = buildMockResources({ busesLoading: true })
    const { fixture } = await render(MapaEMTComponent, {
      providers: [{ provide: EMTResourcesService, useValue: mockResources }],
    })
    TestBed.inject(EMTStore).setLineaSeleccionada('1')
    fixture.detectChanges()
    expect(screen.getByRole('status', { name: /Cargando autobuses/i })).toBeInTheDocument()
  })

  it('shows error message and retry button when hasError', async () => {
    const mockResources = buildMockResources({ busesError: new Error('Network error') })
    await render(MapaEMTComponent, {
      providers: [{ provide: EMTResourcesService, useValue: mockResources }],
    })
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument()
  })

  it('retryUbicaciones calls reload on the resource', async () => {
    const mockResources = buildMockResources({ busesError: new Error('timeout') })
    await render(MapaEMTComponent, {
      providers: [{ provide: EMTResourcesService, useValue: mockResources }],
    })
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }))
    expect(mockResources.ubicacionesResource.reload).toHaveBeenCalledTimes(1)
  })
})
