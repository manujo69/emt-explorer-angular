import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone'
import '@testing-library/jest-dom'

// Expose Node 18 native fetch globals to the jsdom window so MSW can initialize.
// jsdom doesn't include Fetch API; Node 18 has them on globalThis at the process level.
const g = globalThis as Record<string, unknown>
if (g['fetch'] && typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>
  w['fetch'] = g['fetch']
  w['Request'] = g['Request']
  w['Response'] = g['Response']
  w['Headers'] = g['Headers']
}

setupZoneTestEnv()
