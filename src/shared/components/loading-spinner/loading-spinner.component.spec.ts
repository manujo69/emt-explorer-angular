import { render, screen } from '@testing-library/angular'
import { LoadingSpinnerComponent } from './loading-spinner.component'

describe('LoadingSpinnerComponent', () => {
  it('should render with default aria-label', async () => {
    await render(LoadingSpinnerComponent)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should render the label when provided', async () => {
    await render(LoadingSpinnerComponent, {
      inputs: { label: 'Cargando autobuses...' },
    })
    expect(screen.getByText('Cargando autobuses...')).toBeInTheDocument()
  })
})
