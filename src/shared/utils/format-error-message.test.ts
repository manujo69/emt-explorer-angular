import fc from 'fast-check'
import { formatErrorMessage } from './format-error-message'

describe('formatErrorMessage — concrete cases', () => {
  it('extracts message from Error instance', () => {
    expect(formatErrorMessage(new Error('algo salió mal'))).toBe('algo salió mal')
  })

  it('returns fallback for Error with empty message', () => {
    expect(formatErrorMessage(new Error(''))).toBe('Error desconocido')
  })

  it('returns string directly', () => {
    expect(formatErrorMessage('no se pudo conectar')).toBe('no se pudo conectar')
  })

  it('returns fallback for empty string', () => {
    expect(formatErrorMessage('')).toBe('Error desconocido')
  })

  it('returns fallback for number', () => {
    expect(formatErrorMessage(404)).toBe('Error al cargar los datos')
  })

  it('returns fallback for null', () => {
    expect(formatErrorMessage(null)).toBe('Error al cargar los datos')
  })

  it('returns fallback for undefined', () => {
    expect(formatErrorMessage(undefined)).toBe('Error al cargar los datos')
  })

  it('extracts error field from ApiError object', () => {
    expect(formatErrorMessage({ error: 'Error interno del servidor' })).toBe(
      'Error interno del servidor',
    )
  })

  it('returns fallback for object without error field', () => {
    expect(formatErrorMessage({ status: 500 })).toBe('Error al cargar los datos')
  })

  it('returns fallback for object with non-string error field', () => {
    expect(formatErrorMessage({ error: 500 })).toBe('Error al cargar los datos')
  })

  it('returns fallback for object with empty error field', () => {
    expect(formatErrorMessage({ error: '' })).toBe('Error al cargar los datos')
  })

  it('does not expose stack traces from Error objects', () => {
    const err = new Error('test')
    const result = formatErrorMessage(err)
    expect(result).not.toMatch(/at \w/)
    expect(result).not.toContain('stack')
  })
})

// ── Property 12: messages are always readable strings without technical data ──

describe('Property 12: formatErrorMessage always returns a readable string', () => {
  it('always returns a non-empty string for any input', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const result = formatErrorMessage(value)
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
      }),
    )
  })

  it('never returns raw JSON object representations', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const result = formatErrorMessage(value)
        expect(result).not.toMatch(/^\{/)
        expect(result).not.toMatch(/^\[/)
      }),
    )
  })

  it('never exposes stack trace lines', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const result = formatErrorMessage(value)
        expect(result).not.toMatch(/\s+at .+:\d+:\d+/)
      }),
    )
  })

  it('returns the message field for Error instances with readable messages', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[^{[].+/),
        (msg) => {
          const result = formatErrorMessage(new Error(msg))
          expect(result).toBe(msg)
        },
      ),
    )
  })
})
