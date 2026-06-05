import fc from 'fast-check'
import { catmullRomSmooth } from './catmull-rom-smooth'

describe('catmullRomSmooth', () => {
  it('returns empty array for empty input', () => {
    expect(catmullRomSmooth([], 4)).toEqual([])
  })

  it('returns single point for single-point input', () => {
    const pts = [{ lat: 36.7, lng: -4.4 }]
    expect(catmullRomSmooth(pts, 4)).toEqual(pts)
  })

  it('returns (factor+1) points for two-point input', () => {
    const pts = [
      { lat: 36.7, lng: -4.4 },
      { lat: 36.8, lng: -4.5 },
    ]
    const result = catmullRomSmooth(pts, 4)
    expect(result.length).toBe(5)
    expect(result[0].lat).toBeCloseTo(36.7, 5)
    expect(result[result.length - 1].lat).toBeCloseTo(36.8, 5)
  })

  it('produces more points than input for factor > 1', () => {
    const pts = [
      { lat: 36.7, lng: -4.4 },
      { lat: 36.75, lng: -4.45 },
      { lat: 36.8, lng: -4.5 },
    ]
    const result = catmullRomSmooth(pts, 4)
    expect(result.length).toBeGreaterThan(pts.length)
  })

  it('starts and ends at the original endpoints', () => {
    const pts = [
      { lat: 36.7, lng: -4.4 },
      { lat: 36.75, lng: -4.45 },
      { lat: 36.8, lng: -4.5 },
    ]
    const result = catmullRomSmooth(pts, 4)
    const first = result[0]
    const last = result[result.length - 1]
    expect(first.lat).toBeCloseTo(pts[0].lat, 5)
    expect(first.lng).toBeCloseTo(pts[0].lng, 5)
    expect(last.lat).toBeCloseTo(pts[pts.length - 1].lat, 5)
    expect(last.lng).toBeCloseTo(pts[pts.length - 1].lng, 5)
  })

  it('all output points are finite numbers', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            lat: fc.float({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
            lng: fc.float({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
          }),
          { minLength: 0, maxLength: 8 },
        ),
        fc.integer({ min: 1, max: 8 }),
        (points, factor) => {
          const result = catmullRomSmooth(points, factor)
          for (const p of result) {
            expect(Number.isFinite(p.lat)).toBe(true)
            expect(Number.isFinite(p.lng)).toBe(true)
          }
        },
      ),
    )
  })

  it('output length is (n-1)*factor + 1 for n >= 2 points', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            lat: fc.float({ min: 35, max: 38, noNaN: true, noDefaultInfinity: true }),
            lng: fc.float({ min: -5, max: -4, noNaN: true, noDefaultInfinity: true }),
          }),
          { minLength: 2, maxLength: 8 },
        ),
        fc.integer({ min: 1, max: 6 }),
        (points, factor) => {
          const result = catmullRomSmooth(points, factor)
          const expected = (points.length - 1) * factor + 1
          expect(result.length).toBe(expected)
        },
      ),
    )
  })
})
