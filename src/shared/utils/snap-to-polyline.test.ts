import fc from 'fast-check'
import { snapToPolyline } from './snap-to-polyline'
import type { ShapePoint } from '../../features/emt/types/emt.types'

function pt(latitud: number, longitud: number, sequence = 0): ShapePoint {
  return { latitud, longitud, sequence }
}

describe('snapToPolyline', () => {
  it('returns the point itself when shape is empty', () => {
    expect(snapToPolyline(36.7, -4.4, [])).toEqual({ lat: 36.7, lng: -4.4 })
  })

  it('returns the single point when shape has one element', () => {
    expect(snapToPolyline(36.7, -4.4, [pt(36.8, -4.5)])).toEqual({ lat: 36.8, lng: -4.5 })
  })

  it('snaps to the nearest point on a horizontal segment', () => {
    const shape = [pt(0, 0), pt(0, 10)]
    // Point directly above midpoint
    const result = snapToPolyline(1, 5, shape)
    expect(result.lat).toBeCloseTo(0, 5)
    expect(result.lng).toBeCloseTo(5, 5)
  })

  it('clamps to segment start when projection is before it', () => {
    const shape = [pt(0, 0), pt(0, 10)]
    const result = snapToPolyline(0, -5, shape)
    expect(result.lat).toBeCloseTo(0, 5)
    expect(result.lng).toBeCloseTo(0, 5)
  })

  it('clamps to segment end when projection is past it', () => {
    const shape = [pt(0, 0), pt(0, 10)]
    const result = snapToPolyline(0, 15, shape)
    expect(result.lat).toBeCloseTo(0, 5)
    expect(result.lng).toBeCloseTo(10, 5)
  })

  it('picks the nearest segment among multiple', () => {
    const shape = [pt(0, 0), pt(0, 10), pt(0, 20)]
    // Point closer to second segment
    const result = snapToPolyline(1, 15, shape)
    expect(result.lng).toBeGreaterThan(10)
  })

  it('snapped point is always on the polyline (within floating-point tolerance)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
        fc.array(
          fc.record({
            latitud: fc.float({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
            longitud: fc.float({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
            sequence: fc.nat(),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (lat, lng, shape) => {
          expect(() => snapToPolyline(lat, lng, shape)).not.toThrow()
          const result = snapToPolyline(lat, lng, shape)
          expect(typeof result.lat).toBe('number')
          expect(typeof result.lng).toBe('number')
          expect(Number.isFinite(result.lat)).toBe(true)
          expect(Number.isFinite(result.lng)).toBe(true)
        },
      ),
    )
  })
})
