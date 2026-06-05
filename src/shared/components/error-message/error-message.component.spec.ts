import { render, screen } from '@testing-library/angular'
import { ErrorMessageComponent } from './error-message.component'

describe('ErrorMessageComponent', () => {
  it('should render the error message', async () => {
    await render(ErrorMessageComponent, {
      inputs: { message: 'Ha ocurrido un error' },
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Ha ocurrido un error')).toBeInTheDocument()
  })
})
