import fc from 'fast-check'
import { haversine } from './haversine'

describe('haversine', () => {
  it('returns 0 for identical points', () => {
    expect(haversine(36.7, -4.4, 36.7, -4.4)).toBe(0)
  })

  it('is symmetric', () => {
    const d1 = haversine(36.7, -4.4, 36.8, -4.5)
    const d2 = haversine(36.8, -4.5, 36.7, -4.4)
    expect(d1).toBeCloseTo(d2, 6)
  })

  it('returns ~111km for 1 degree of latitude', () => {
    const d = haversine(0, 0, 1, 0)
    expect(d).toBeCloseTo(111_195, -2)
  })

  it('returns non-negative for any two points', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
        (lat1, lng1, lat2, lng2) => {
          expect(haversine(lat1, lng1, lat2, lng2)).toBeGreaterThanOrEqual(0)
        },
      ),
    )
  })

  it('satisfies triangle inequality (approx)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -80, max: 80, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -170, max: 170, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -80, max: 80, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -170, max: 170, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -80, max: 80, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -170, max: 170, noNaN: true, noDefaultInfinity: true }),
        (la, loa, lb, lob, lc, loc) => {
          const ab = haversine(la, loa, lb, lob)
          const bc = haversine(lb, lob, lc, loc)
          const ac = haversine(la, loa, lc, loc)
          // Triangle inequality: each side ≤ sum of the other two (with floating-point tolerance)
          expect(ac).toBeLessThanOrEqual(ab + bc + 1e-6)
        },
      ),
    )
  })
})
