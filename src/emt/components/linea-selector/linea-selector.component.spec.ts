import { render, screen, fireEvent } from '@testing-library/angular'
import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LineaSelectorComponent } from './linea-selector.component'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import type { LineaEMT } from '../../types/emt.types'

const LINEAS_MOCK: LineaEMT[] = [
  { codLinea: '1', userCodLinea: 'L1', nombreLinea: 'Línea 1' },
  { codLinea: '2', userCodLinea: 'L2', nombreLinea: 'Línea 2' },
]

function buildMockResources(options: { lineas?: LineaEMT[]; loading?: boolean; error?: unknown } = {}) {
  const noRes = { value: signal<unknown>(undefined), isLoading: signal(false), error: signal<unknown>(undefined), reload: jest.fn() }
  return {
    lineasResource: {
      value: signal<LineaEMT[] | undefined>(options.lineas ?? LINEAS_MOCK),
      isLoading: signal(options.loading ?? false),
      error: signal<unknown>(options.error),
      reload: jest.fn(),
    },
    paradasResource: noRes,
    ubicacionesResource: noRes,
    shapesResource: noRes,
    llegadasResource: noRes,
  }
}

describe('LineaSelectorComponent', () => {
  it('shows loading text while lines are loading', async () => {
    await render(LineaSelectorComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources({ loading: true, lineas: undefined }) }],
    })
    expect(screen.getByText('Cargando líneas...')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows error text when loading fails', async () => {
    await render(LineaSelectorComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources({ error: new Error('fail'), lineas: undefined }) }],
    })
    expect(screen.getByText('Error al cargar líneas')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('renders a select with an option per line', async () => {
    await render(LineaSelectorComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources() }],
    })
    expect(screen.getByRole('combobox', { name: /seleccionar línea/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /L1 — Línea 1/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /L2 — Línea 2/i })).toBeInTheDocument()
  })

  it('calls setLineaSeleccionada with the selected line code', async () => {
    await render(LineaSelectorComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources() }],
    })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    expect(TestBed.inject(EMTStore).lineaSeleccionada()).toBe('1')
  })

  it('calls setLineaSeleccionada with null when empty option is selected', async () => {
    await render(LineaSelectorComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources() }],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('1')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } })
    expect(store.lineaSeleccionada()).toBeNull()
  })
})
