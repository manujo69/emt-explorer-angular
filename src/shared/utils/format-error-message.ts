const JSON_START = /^[{[]/

function isReadableMessage(s: string): boolean {
  return s.length > 0 && !JSON_START.test(s)
}

export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return isReadableMessage(error.message) ? error.message : 'Error desconocido'
  }
  if (typeof error === 'string') {
    return isReadableMessage(error) ? error : 'Error desconocido'
  }
  if (error !== null && typeof error === 'object' && 'error' in error) {
    const msg = (error as { error: unknown }).error
    if (typeof msg === 'string' && isReadableMessage(msg)) return msg
  }
  return 'Error al cargar los datos'
}
