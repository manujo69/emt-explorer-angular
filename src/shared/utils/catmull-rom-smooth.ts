export function catmullRomSmooth(
  points: Array<{ lat: number; lng: number }>,
  factor: number,
): Array<{ lat: number; lng: number }> {
  if (points.length < 2) return [...points]

  const result: Array<{ lat: number; lng: number }> = []

  // Pad with phantom endpoints for a closed-enough tangent at boundaries
  const pts = [points[0], ...points, points[points.length - 1]]

  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2]

    for (let j = 0; j < factor; j++) {
      const t = j / factor
      const t2 = t * t
      const t3 = t2 * t

      const lat =
        0.5 *
        (2 * p1.lat +
          (-p0.lat + p2.lat) * t +
          (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 +
          (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3)

      const lng =
        0.5 *
        (2 * p1.lng +
          (-p0.lng + p2.lng) * t +
          (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * t2 +
          (-p0.lng + 3 * p1.lng - 3 * p2.lng + p3.lng) * t3)

      result.push({ lat, lng })
    }
  }

  result.push(points[points.length - 1])
  return result
}
