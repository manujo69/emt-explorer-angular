import { render, screen } from '@testing-library/angular'
import { BusMarkerComponent } from './bus-marker.component'
import type { BusUbicacion } from '../../types/emt.types'

const BUS: BusUbicacion = {
  codBus: 'B1',
  codLinea: '1',
  sentido: 1,
  longitud: -4.4214,
  latitud: 36.7213,
  codParIni: '100',
  lastUpdate: '2026-01-01',
}

async function renderBus(bus: BusUbicacion, zoom: number) {
  return render(BusMarkerComponent, { inputs: { bus, zoom } })
}

describe('BusMarkerComponent', () => {
  it('renders the line code inside the SVG title', async () => {
    await renderBus(BUS, 14)
    expect(screen.getByRole('img', { name: /Línea 1 — sentido 1/ })).toBeInTheDocument()
  })

  it('sets size to 12 at zoom ≤ 13', async () => {
    const { fixture } = await renderBus(BUS, 13)
    expect(fixture.componentInstance.size()).toBe(12)
  })

  it('sets size to 32 at zoom ≥ 16', async () => {
    const { fixture } = await renderBus(BUS, 16)
    expect(fixture.componentInstance.size()).toBe(32)
  })

  it('interpolates size between 12 and 32 at zoom 14.5', async () => {
    const { fixture } = await renderBus(BUS, 14.5)
    const size = fixture.componentInstance.size()
    expect(size).toBeGreaterThan(12)
    expect(size).toBeLessThan(32)
  })

  it('computes lngLat from bus coordinates', async () => {
    const { fixture } = await renderBus(BUS, 14)
    expect(fixture.componentInstance.lngLat()).toEqual([-4.4214, 36.7213])
  })

  it('title reflects line code and sentido', async () => {
    const bus2 = { ...BUS, codLinea: '10', sentido: 2 }
    const { fixture } = await renderBus(bus2, 14)
    expect(fixture.componentInstance.title()).toBe('Línea 10 — sentido 2')
  })
})
