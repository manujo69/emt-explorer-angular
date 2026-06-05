import { fetch as undiciFetch, Agent } from 'undici'

// datosabiertos.malaga.eu requires:
// 1. HTTP/1.1 — server doesn't support HTTP/2 via ALPN (undici default), causing TCP timeout
// 2. User-Agent header — server returns 403 without one
const agent = new Agent({
  connect: { ALPNProtocols: ['http/1.1'] },
})

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; emt-explorer/1.0)',
  'Accept': '*/*',
}

export interface EtmResponse {
  ok: boolean
  status: number
  text(): Promise<string>
}

export function fetchEMT(url: string): Promise<EtmResponse> {
  return undiciFetch(url, {
    dispatcher: agent,
    headers: REQUEST_HEADERS,
  }) as unknown as Promise<EtmResponse>
}
