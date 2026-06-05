import { render, screen, fireEvent } from '@testing-library/angular'
import { provideHttpClient, withFetch } from '@angular/common/http'
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { LineasPageComponent } from './lineas-page.component'
import type { LineaEMT } from '../../types/emt.types'

const LINEAS_MOCK: LineaEMT[] = [
  { codLinea: '1', userCodLinea: 'L1', nombreLinea: 'Línea 1', cabeceraIda: 'Norte', cabeceraVuelta: 'Sur' },
  { codLinea: '2', userCodLinea: 'L2', nombreLinea: 'Línea 2' },
]

const PROVIDERS = [provideHttpClient(withFetch()), provideHttpClientTesting()]

describe('LineasPageComponent', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify())

  it('shows the count of available lines once loaded', async () => {
    await render(LineasPageComponent, { providers: PROVIDERS })
    TestBed.inject(HttpTestingController).expectOne('/api/emt/lineas').flush(LINEAS_MOCK)
    expect(await screen.findByText('2 líneas disponibles')).toBeInTheDocument()
  })

  it('shows an error banner when the API returns a server error', async () => {
    await render(LineasPageComponent, { providers: PROVIDERS })
    TestBed.inject(HttpTestingController).expectOne('/api/emt/lineas').flush('Error', { status: 500, statusText: 'Server Error' })
    expect(await screen.findByText(/Error al cargar las líneas/)).toBeInTheDocument()
  })

  it('renders a button for each line', async () => {
    await render(LineasPageComponent, { providers: PROVIDERS })
    TestBed.inject(HttpTestingController).expectOne('/api/emt/lineas').flush(LINEAS_MOCK)
    await screen.findByText('2 líneas disponibles')
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
  })

  it('shows cabeceras in the info panel after selecting a line', async () => {
    await render(LineasPageComponent, { providers: PROVIDERS })
    TestBed.inject(HttpTestingController).expectOne('/api/emt/lineas').flush(LINEAS_MOCK)
    await screen.findByText('2 líneas disponibles')
    fireEvent.click(screen.getByRole('button', { name: '1' }))
    expect(screen.getByText('Ida: Norte')).toBeInTheDocument()
    expect(screen.getByText('Vuelta: Sur')).toBeInTheDocument()
  })

  it('does not show cabeceras for a line that has none', async () => {
    await render(LineasPageComponent, { providers: PROVIDERS })
    TestBed.inject(HttpTestingController).expectOne('/api/emt/lineas').flush(LINEAS_MOCK)
    await screen.findByText('2 líneas disponibles')
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(screen.queryByText(/Ida:/)).not.toBeInTheDocument()
  })
})
