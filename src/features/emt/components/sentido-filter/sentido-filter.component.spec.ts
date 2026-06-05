import { render, screen, fireEvent } from '@testing-library/angular'
import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { SentidoFilterComponent } from './sentido-filter.component'
import { EMTResourcesService } from '../../services/emt-resources.service'
import { EMTStore } from '../../store/emt.store'
import type { LineaEMT } from '../../types/emt.types'

const LINEA_NORMAL: LineaEMT = {
  codLinea: '1', userCodLinea: 'L1', nombreLinea: 'Línea 1',
  cabeceraIda: 'Norte', cabeceraVuelta: 'Sur',
}
const LINEA_CIRCULAR: LineaEMT = {
  codLinea: 'C', userCodLinea: 'C1', nombreLinea: 'Circular Norte',
}

function buildMockResources(lineas: LineaEMT[] = []) {
  const noRes = { value: signal<unknown>(undefined), isLoading: signal(false), error: signal<unknown>(undefined), reload: jest.fn() }
  return {
    lineasResource: {
      value: signal<LineaEMT[] | undefined>(lineas),
      isLoading: signal(false),
      error: signal<unknown>(undefined),
      reload: jest.fn(),
    },
    paradasResource: noRes,
    ubicacionesResource: noRes,
    shapesResource: noRes,
    llegadasResource: noRes,
  }
}

describe('SentidoFilterComponent', () => {
  it('is aria-hidden when no line is selected', async () => {
    const { container } = await render(SentidoFilterComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources([LINEA_NORMAL]) }],
    })
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.getAttribute('aria-hidden')).toBe('true')
  })

  it('is aria-hidden for a circular line', async () => {
    const { container, fixture } = await render(SentidoFilterComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources([LINEA_CIRCULAR]) }],
    })
    TestBed.inject(EMTStore).setLineaSeleccionada('C')
    fixture.detectChanges()
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.getAttribute('aria-hidden')).toBe('true')
  })

  it('is visible for a normal line with both headers', async () => {
    const { container, fixture } = await render(SentidoFilterComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources([LINEA_NORMAL]) }],
    })
    TestBed.inject(EMTStore).setLineaSeleccionada('1')
    fixture.detectChanges()
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.getAttribute('aria-hidden')).toBeNull()
  })

  it('labels the switches with cabeceraIda and cabeceraVuelta', async () => {
    const { fixture } = await render(SentidoFilterComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources([LINEA_NORMAL]) }],
    })
    TestBed.inject(EMTStore).setLineaSeleccionada('1')
    fixture.detectChanges()
    expect(screen.getByRole('switch', { name: /Norte/ })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Sur/ })).toBeInTheDocument()
  })

  it('both switches start as active (aria-checked=true)', async () => {
    const { fixture } = await render(SentidoFilterComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources([LINEA_NORMAL]) }],
    })
    TestBed.inject(EMTStore).setLineaSeleccionada('1')
    fixture.detectChanges()
    const switches = screen.getAllByRole('switch')
    expect(switches[0]).toHaveAttribute('aria-checked', 'true')
    expect(switches[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('toggles sentido off when the active switch is clicked', async () => {
    const { fixture } = await render(SentidoFilterComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources([LINEA_NORMAL]) }],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('1')
    fixture.detectChanges()
    fireEvent.click(screen.getAllByRole('switch')[0])
    expect(store.sentidosActivos()).not.toContain(1)
    expect(store.sentidosActivos()).toContain(2)
  })

  it('does not toggle the last active sentido off', async () => {
    const { fixture } = await render(SentidoFilterComponent, {
      providers: [{ provide: EMTResourcesService, useValue: buildMockResources([LINEA_NORMAL]) }],
    })
    const store = TestBed.inject(EMTStore)
    store.setLineaSeleccionada('1')
    fixture.detectChanges()
    // Deactivate sentido 2 first
    fireEvent.click(screen.getAllByRole('switch')[1])
    fixture.detectChanges()
    // Attempt to deactivate the only remaining sentido 1
    fireEvent.click(screen.getAllByRole('switch')[0])
    expect(store.sentidosActivos()).toEqual([1])
  })
})
