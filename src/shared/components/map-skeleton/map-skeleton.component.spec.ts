import { render } from '@testing-library/angular'
import { MapSkeletonComponent } from './map-skeleton.component'

describe('MapSkeletonComponent', () => {
  it('should create', async () => {
    const { container } = await render(MapSkeletonComponent)
    expect(container).toBeTruthy()
  })
})
