import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { connect } from 'node:net'

// A bare hostname only — no scheme, no path, no port. The frontend already
// strips those (see hostFromInput in App.tsx) before calling this endpoint;
// this is a server-side sanity check, not general URL parsing.
const HOSTNAME_PATTERN =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

const CONNECT_PORT = 443
const CONNECT_TIMEOUT_MS = 5000

interface PingResult {
  ok: boolean
  latencyMs?: number
}

// Times a raw TCP handshake to `host:443` rather than an HTTP request —
// closer to what a network-level "ping" measures than a full HTTPS fetch.
// Deliberately NOT shelling out to the OS `ping` binary: that would mean
// building a command string from user-supplied input (an injection risk
// to get right) and depending on a `ping` binary actually being present
// in Azure's Linux Consumption sandbox, which isn't documented or
// guaranteed. `net.connect` is a plain Node API call — no shell involved.
function measureTcpConnect(host: string): Promise<PingResult> {
  return new Promise((resolve) => {
    const start = performance.now()
    const socket = connect({ host, port: CONNECT_PORT, timeout: CONNECT_TIMEOUT_MS })

    // Whichever of connect/timeout/error fires first wins; `.once` means
    // only one of these three ever actually runs `finish`.
    function finish(result: PingResult) {
      socket.destroy()
      resolve(result)
    }

    socket.once('connect', () =>
      finish({ ok: true, latencyMs: Math.round(performance.now() - start) }),
    )
    socket.once('timeout', () => finish({ ok: false }))
    socket.once('error', () => finish({ ok: false }))
  })
}

export async function ping(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const host = request.query.get('host')?.trim()

  if (!host || host.length > 253 || !HOSTNAME_PATTERN.test(host)) {
    return { status: 400, jsonBody: { ok: false, error: 'Missing or invalid "host" query parameter' } }
  }

  context.log(`Measuring TCP connect time to ${host}:${CONNECT_PORT}`)
  const result = await measureTcpConnect(host)
  return { jsonBody: result }
}

app.http('ping', {
  methods: ['GET'],
  route: 'ping',
  authLevel: 'anonymous',
  handler: ping,
})
