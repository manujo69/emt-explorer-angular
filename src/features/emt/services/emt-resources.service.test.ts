import { TestBed, fakeAsync, flushMicrotasks, tick, discardPeriodicTasks } from '@angular/core/testing'
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing'
import { provideHttpClient, withFetch } from '@angular/common/http'
import { of } from 'rxjs'
import { EMTApiService } from './emt-api.service'
import { EMTStore } from '../store/emt.store'
import { EMTResourcesService, POLL_INTERVAL_MS } from './emt-resources.service'
import type { LineaEMT, BusUbicacion } from '../types/emt.types'

const LINEAS_MOCK: LineaEMT[] = [
  { codLinea: '1', userCodLinea: '1', nombreLinea: 'Línea 1', cabeceraIda: 'Norte', cabeceraVuelta: 'Sur' },
  { codLinea: '2', userCodLinea: '2', nombreLinea: 'Línea 2' },
]

const BUSES_MOCK: BusUbicacion[] = [
  { codBus: 'B1', codLinea: '1', sentido: 1, longitud: -4.42, latitud: 36.72, codParIni: '100', lastUpdate: '2026-01-01' },
]

// Spy that returns a static observable — avoids timer complexity in unit tests.
const mockApi = {
  getUbicaciones: jest.fn().mockReturnValue(of(BUSES_MOCK)),
}

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withFetch()),
      provideHttpClientTesting(),
      { provide: EMTApiService, useValue: mockApi },
    ],
  })
  mockApi.getUbicaciones.mockReset()
  mockApi.getUbicaciones.mockReturnValue(of(BUSES_MOCK))
  const resources = TestBed.inject(EMTResourcesService)
  const store = TestBed.inject(EMTStore)
  const http = TestBed.inject(HttpTestingController)
  TestBed.flushEffects()
  return { store, resources, http }
}

describe('EMTResourcesService — lineasResource', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify())

  it('fires a request to /api/emt/lineas on initialization', fakeAsync(() => {
    const { resources, http } = setup()

    http.expectOne('/api/emt/lineas').flush(LINEAS_MOCK)
    TestBed.flushEffects()
    flushMicrotasks()

    expect(resources.lineasResource.value()).toEqual(LINEAS_MOCK)
  }))

  it('exposes error state when the request fails', fakeAsync(() => {
    const { resources, http } = setup()

    http.expectOne('/api/emt/lineas').flush('Error', { status: 500, statusText: 'Server Error' })
    TestBed.flushEffects()
    flushMicrotasks()

    expect(resources.lineasResource.error()).toBeTruthy()
  }))
})

describe('EMTResourcesService — paradasResource', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify())

  it('makes no request when lineaSeleccionada is null', fakeAsync(() => {
    const { http } = setup()
    http.expectOne('/api/emt/lineas').flush([])
    TestBed.flushEffects()
    flushMicrotasks()
    http.expectNone('/api/emt/paradas')
  }))

  it('requests paradas when lineaSeleccionada is set', fakeAsync(() => {
    const { store, resources, http } = setup()
    http.expectOne('/api/emt/lineas').flush([])
    TestBed.flushEffects()
    flushMicrotasks()

    store.setLineaSeleccionada('1')
    TestBed.flushEffects()
    tick(0)
    flushMicrotasks()

    http.expectOne('/api/emt/paradas?linea=1').flush([])
    http.expectOne('/api/emt/shapes?linea=1').flush({})
    TestBed.flushEffects()
    flushMicrotasks()
    discardPeriodicTasks()

    expect(resources.paradasResource.isLoading()).toBe(false)
  }))
})

describe('EMTResourcesService — llegadasResource', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify())

  it('makes no request when paradaSeleccionada is null', fakeAsync(() => {
    const { http } = setup()
    http.expectOne('/api/emt/lineas').flush([])
    TestBed.flushEffects()
    flushMicrotasks()
    http.expectNone('/api/emt/llegadas')
  }))

  it('requests llegadas when paradaSeleccionada is set', fakeAsync(() => {
    const { store, resources, http } = setup()
    http.expectOne('/api/emt/lineas').flush([])
    TestBed.flushEffects()
    flushMicrotasks()

    store.setParadaSeleccionada('152')
    TestBed.flushEffects()
    flushMicrotasks()

    http.expectOne('/api/emt/llegadas?parada=152').flush([])
    TestBed.flushEffects()
    flushMicrotasks()

    expect(resources.llegadasResource.isLoading()).toBe(false)
  }))
})

describe('EMTResourcesService — shapesResource', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify())

  it('makes no request when lineaSeleccionada is null', fakeAsync(() => {
    const { http } = setup()
    http.expectOne('/api/emt/lineas').flush([])
    TestBed.flushEffects()
    flushMicrotasks()
    http.expectNone('/api/emt/shapes')
  }))

  it('requests shapes when lineaSeleccionada is set', fakeAsync(() => {
    const { store, resources, http } = setup()
    http.expectOne('/api/emt/lineas').flush([])
    TestBed.flushEffects()
    flushMicrotasks()

    store.setLineaSeleccionada('1')
    TestBed.flushEffects()
    tick(0)
    flushMicrotasks()

    http.expectOne('/api/emt/paradas?linea=1').flush([])
    http.expectOne('/api/emt/shapes?linea=1').flush({})
    TestBed.flushEffects()
    flushMicrotasks()
    discardPeriodicTasks()

    expect(resources.shapesResource.isLoading()).toBe(false)
  }))
})

describe('EMTResourcesService — ubicacionesResource', () => {
  it('returns empty array when lineaSeleccionada is null', fakeAsync(() => {
    const { resources, http } = setup()
    http.expectOne('/api/emt/lineas').flush([])
    TestBed.flushEffects()
    flushMicrotasks()

    expect(resources.ubicacionesResource.value()).toEqual([])
    expect(mockApi.getUbicaciones).not.toHaveBeenCalled()
    TestBed.inject(HttpTestingController).verify()
  }))

  it('calls getUbicaciones when lineaSeleccionada is set', fakeAsync(() => {
    const { store, resources, http } = setup()
    http.expectOne('/api/emt/lineas').flush([])
    TestBed.flushEffects()
    flushMicrotasks()

    store.setLineaSeleccionada('1')
    TestBed.flushEffects()
    tick(0)
    flushMicrotasks()

    http.expectOne('/api/emt/paradas?linea=1').flush([])
    http.expectOne('/api/emt/shapes?linea=1').flush({})
    TestBed.flushEffects()
    flushMicrotasks()
    discardPeriodicTasks()

    expect(mockApi.getUbicaciones).toHaveBeenCalledWith('1')
    expect(resources.ubicacionesResource.value()).toEqual(BUSES_MOCK)
    TestBed.inject(HttpTestingController).verify()
  }))

  it('calls getUbicaciones again after POLL_INTERVAL_MS', fakeAsync(() => {
    const { store, http } = setup()
    http.expectOne('/api/emt/lineas').flush([])
    TestBed.flushEffects()
    flushMicrotasks()

    store.setLineaSeleccionada('1')
    TestBed.flushEffects()
    tick(0)
    flushMicrotasks()

    http.expectOne('/api/emt/paradas?linea=1').flush([])
    http.expectOne('/api/emt/shapes?linea=1').flush({})
    TestBed.flushEffects()
    flushMicrotasks()

    const callCountAfterFirst = mockApi.getUbicaciones.mock.calls.length

    tick(POLL_INTERVAL_MS)
    flushMicrotasks()
    discardPeriodicTasks()

    expect(mockApi.getUbicaciones.mock.calls.length).toBeGreaterThan(callCountAfterFirst)
    TestBed.inject(HttpTestingController).verify()
  }))
})
