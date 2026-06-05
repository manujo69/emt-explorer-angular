import { TestBed } from '@angular/core/testing'
import * as fc from 'fast-check'
import { EMTStore } from './emt.store'

describe('EMTStore — initial state', () => {
  let store: InstanceType<typeof EMTStore>

  beforeEach(() => {
    TestBed.configureTestingModule({})
    store = TestBed.inject(EMTStore)
  })

  it('starts with no line selected', () => {
    expect(store.lineaSeleccionada()).toBeNull()
  })

  it('starts with both sentidos active', () => {
    expect(store.sentidosActivos()).toEqual([1, 2])
  })

  it('starts with no parada selected', () => {
    expect(store.paradaSeleccionada()).toBeNull()
  })
})

describe('EMTStore — setLineaSeleccionada', () => {
  let store: InstanceType<typeof EMTStore>

  beforeEach(() => {
    TestBed.configureTestingModule({})
    store = TestBed.inject(EMTStore)
  })

  it('sets the selected line', () => {
    store.setLineaSeleccionada('1')
    expect(store.lineaSeleccionada()).toBe('1')
  })

  it('resets sentidosActivos to [1,2] when line changes', () => {
    store.setLineaSeleccionada('1')
    store.toggleSentido(2)
    expect(store.sentidosActivos()).toEqual([1])

    store.setLineaSeleccionada('2')
    expect(store.sentidosActivos()).toEqual([1, 2])
  })

  it('resets paradaSeleccionada when line changes', () => {
    store.setLineaSeleccionada('1')
    store.setParadaSeleccionada('100')
    store.setLineaSeleccionada('2')
    expect(store.paradaSeleccionada()).toBeNull()
  })

  it('accepts null to deselect', () => {
    store.setLineaSeleccionada('1')
    store.setLineaSeleccionada(null)
    expect(store.lineaSeleccionada()).toBeNull()
  })
})

describe('EMTStore — toggleSentido', () => {
  let store: InstanceType<typeof EMTStore>

  beforeEach(() => {
    TestBed.configureTestingModule({})
    store = TestBed.inject(EMTStore)
  })

  it('removes a sentido that is active', () => {
    store.toggleSentido(1)
    expect(store.sentidosActivos()).toEqual([2])
  })

  it('adds a sentido that is not active', () => {
    store.toggleSentido(1)
    store.toggleSentido(1)
    expect(store.sentidosActivos()).toContain(1)
  })

  it('does not leave sentidosActivos empty when toggling the last one', () => {
    store.toggleSentido(1)
    store.toggleSentido(2)
    expect(store.sentidosActivos()).toEqual([2])
  })
})

describe('EMTStore — setParadaSeleccionada', () => {
  let store: InstanceType<typeof EMTStore>

  beforeEach(() => {
    TestBed.configureTestingModule({})
    store = TestBed.inject(EMTStore)
  })

  it('sets selected parada', () => {
    store.setParadaSeleccionada('152')
    expect(store.paradaSeleccionada()).toBe('152')
  })

  it('accepts null to deselect', () => {
    store.setParadaSeleccionada('152')
    store.setParadaSeleccionada(null)
    expect(store.paradaSeleccionada()).toBeNull()
  })
})

// ── Property 11: store always reflects the last selected line ─────────────────

describe('Property 11: store reflects the last selected line', () => {
  let store: InstanceType<typeof EMTStore>

  beforeEach(() => {
    TestBed.configureTestingModule({})
    store = TestBed.inject(EMTStore)
  })

  it('lineaSeleccionada always equals the last argument passed to setLineaSeleccionada', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.stringMatching(/^[A-Za-z0-9]{1,4}$/), fc.constant(null)), {
          minLength: 1,
          maxLength: 20,
        }),
        (lineas) => {
          store.setLineaSeleccionada(null)
          for (const linea of lineas) {
            store.setLineaSeleccionada(linea)
          }
          expect(store.lineaSeleccionada()).toBe(lineas[lineas.length - 1])
        },
      ),
    )
  })
})

// ── Property 13: sentidosActivos is never empty ───────────────────────────────

describe('Property 13: sentidosActivos is never empty', () => {
  let store: InstanceType<typeof EMTStore>

  beforeEach(() => {
    TestBed.configureTestingModule({})
    store = TestBed.inject(EMTStore)
  })

  it('any sequence of toggleSentido calls leaves at least one sentido active', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 2 }), { minLength: 1, maxLength: 30 }),
        (toggles) => {
          store.setLineaSeleccionada('1')
          for (const s of toggles) {
            store.toggleSentido(s)
          }
          expect(store.sentidosActivos().length).toBeGreaterThan(0)
        },
      ),
    )
  })
})
