// `useState` and `useEffect` are "hooks" — plain functions from React
// that only work when called directly inside a function component (not
// inside loops/conditions/nested functions). There's no real C# analog;
// the closest mental model is that React secretly keeps a per-component
// slot of memory, and calling useState() "checks out" the next slot in
// that memory, in the exact order you call it every time the component
// runs. That's why hook call order must stay identical between renders.
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import PingChart from './PingChart'
import type { PingDataPoint } from './types'
import './App.css'

// Module-level `const` — evaluated once when the file is first loaded,
// same idea as a C# `static readonly` field, just without a class
// wrapping it (JS/TS modules don't require everything to live in a class).
const POLL_INTERVAL_MS = 2000
const MAX_POINTS = 20

function nowLabel() {
  return new Date().toLocaleTimeString()
}

// The user types a bare host ("example.com"), not a full URL, so this
// fills in the `https://` prefix — unless they already typed one
// (`http://internal-box/`, say), in which case we leave it alone.
function buildTargetUrl(host: string) {
  const trimmed = host.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

// Times one real round trip to `url` using performance.now() — a
// high-resolution, monotonic clock meant exactly for measuring elapsed
// time, unlike Date.now() (which can jump if the system clock changes).
//
// `mode: 'no-cors'` matters here: Step 4 only ever hit one CORS-friendly
// endpoint we controlled the choice of, so the browser was allowed to
// expose the response and we could check `response.ok`. Now the user can
// type ANY host, and most of the internet does not send the
// `Access-Control-Allow-Origin` header that would let a normal `fetch()`
// read the response cross-origin — the browser would block it and every
// request would fail. `no-cors` mode asks for an "opaque" response
// instead: the browser still performs the request and the fetch promise
// still resolves (or rejects on a real network failure — offline, DNS
// error, refused connection), which is all we need for timing, but we
// can no longer read the response body or check its HTTP status.
// That's the trade-off that makes arbitrary hostnames work at all.
async function measureLatencyMs(url: string) {
  const start = performance.now()
  try {
    await fetch(url, { cache: 'no-store', mode: 'no-cors' })
    return Math.round(performance.now() - start)
  } catch {
    return null
  }
}

function App() {
  // useState<PingDataPoint[]> — the `<...>` is a generic type argument,
  // same syntax and purpose as C#'s `List<PingDataPoint>`. It tells
  // TypeScript what type `data` will hold, since it can't be inferred
  // from a lazily-computed initial value (see below).
  //
  // Calling `setData` later does NOT mutate this array in place — it
  // tells React "here's the new value for this piece of state," which
  // triggers App to re-run (re-render) with `data` bound to the new
  // array. This is conceptually close to a bindable/observable property
  // in WPF/MVVM (like implementing INotifyPropertyChanged) — setting it
  // is what causes the UI to refresh, not the mutation itself.
  //
  // Starting empty (rather than one fake point) because the first real
  // point now depends on an actual network round trip, which can't
  // happen synchronously during render the way `randomLatencyMs()` could.
  const [data, setData] = useState<PingDataPoint[]>([])

  // `hostInput` is a "controlled" input: the <input> element's value is
  // driven entirely by this state (via `value={hostInput}`), and every
  // keystroke fires `onChange`, which updates the state, which re-renders
  // the input with the new value. Compare to a WinForms TextBox, where
  // `.Text` just holds whatever the user typed — here React insists on
  // owning that value itself rather than letting the DOM hold its own
  // copy, which is what makes "disable Start until non-empty" below a
  // plain read of state rather than a DOM query.
  const [hostInput, setHostInput] = useState('')

  // `targetUrl` is deliberately a SEPARATE piece of state from
  // `hostInput`, only written by handleStart. If the effect below instead
  // depended on `hostInput` directly, every keystroke would restart
  // polling against a half-typed hostname. Splitting "what's in the box"
  // from "what we're actually polling" is what lets Start act like a
  // commit/confirm step.
  const [targetUrl, setTargetUrl] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  function handleStart(event: FormEvent) {
    // <form onSubmit> fires on both a Start button click and pressing
    // Enter in the input — preventDefault stops the browser's default
    // "navigate to this URL" full-page-reload behavior for form submits.
    event.preventDefault()
    if (!hostInput.trim()) return
    setData([]) // clear the chart so old and new hosts don't mix on one line
    setTargetUrl(buildTargetUrl(hostInput))
    setIsRunning(true)
  }

  function handleStop() {
    setIsRunning(false)
  }

  // useEffect runs side effects (anything reaching outside of "compute
  // some UI from props/state") after React has rendered. Setting up a
  // timer is a classic example — it's not something you can express as
  // "just" a return value of the component function.
  //
  // The dependency array now lists `isRunning` and `targetUrl` instead of
  // being empty: this effect re-runs (tearing down the old timer via
  // cleanup, then setting up a new one) whenever either changes — i.e.
  // whenever Start or Stop is clicked. That's the whole mechanism behind
  // the buttons; there's no separate "timer control" API being called.
  useEffect(() => {
    // Stopped, or nothing has ever been started yet — do nothing, and
    // skip straight to the (no-op) cleanup below.
    if (!isRunning || !targetUrl) return

    // `cancelled` guards against setting state after this effect's
    // cleanup has run — e.g. a slow fetch resolving after Stop was
    // clicked, or (in React 18 StrictMode's dev-only double-invoke) after
    // the first mount/cleanup pair. Closest C# analogy: checking a
    // CancellationToken before touching shared state.
    let cancelled = false

    // The very first request to a host pays a one-time cost this timer
    // shouldn't take credit for: DNS lookup, TCP handshake, TLS
    // handshake — none of which happen again on later requests, since the
    // browser reuses that connection. `isFirstPoll` is what let us
    // measure and discard that one cold-start sample without complicating
    // `measureLatencyMs` itself. It's a plain closure variable rather
    // than state because updating it should never trigger a re-render —
    // same reasoning as `cancelled` above.
    let isFirstPoll = true

    // setInterval's callback can't itself be `async` — setInterval just
    // ignores whatever value it returns — so we define a normal async
    // function and call it, both once immediately and on every tick.
    async function poll() {
      const latencyMs = await measureLatencyMs(targetUrl!)
      if (cancelled || latencyMs === null) return
      if (isFirstPoll) {
        // Warm the connection and discard the reading; only flip this
        // once a measurement actually succeeds, so a failed warm-up
        // attempt (e.g. transient DNS error) doesn't leave the real first
        // sample discarded too.
        isFirstPoll = false
        return
      }
      setData((prev) => {
        const next = [...prev, { time: nowLabel(), latencyMs }]
        // Trim to a rolling window of the last MAX_POINTS entries so the
        // chart doesn't grow forever.
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
      })
    }

    poll() // fire the (discarded) warm-up request right away instead of waiting a full interval
    const id = setInterval(poll, POLL_INTERVAL_MS)

    // The function returned from useEffect is its "cleanup" function —
    // React calls it automatically before the effect re-runs (Start/Stop
    // clicked again) or when the component unmounts. This is the closest
    // thing React has to C#'s IDisposable.Dispose().
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isRunning, targetUrl])

  // The JSX returned here is re-evaluated every time `data` changes
  // (because setData was called), producing a new description of what
  // the UI should look like. React then diffs that against what's
  // currently on screen and patches only what changed — you never
  // manually touch the DOM yourself, unlike raw JS or a WinForms
  // `control.Text = "..."` assignment.
  return (
    <main className="app">
      <h1>Ping Latency</h1>
      {/* onSubmit on the <form> (rather than onClick on the button alone)
          is what makes pressing Enter in the input also trigger Start —
          the browser fires a form's submit event either way. */}
      <form className="controls" onSubmit={handleStart}>
        <input
          type="text"
          value={hostInput}
          onChange={(event) => setHostInput(event.target.value)}
          placeholder="e.g. example.com"
          aria-label="Host to ping"
          disabled={isRunning}
        />
        <button type="submit" disabled={isRunning || !hostInput.trim()}>
          Start
        </button>
        <button type="button" onClick={handleStop} disabled={!isRunning}>
          Stop
        </button>
      </form>
      <p className="subtitle">
        {/* Curly braces embed real TypeScript expressions inside JSX —
            here, a conditional (ternary) expression picking between two
            strings depending on `isRunning`. */}
        {isRunning && targetUrl
          ? `Live polling every ${POLL_INTERVAL_MS / 1000}s · real fetch() round-trip time to ${targetUrl}, rolling window of ${MAX_POINTS} points`
          : 'Type a host above and press Start to begin measuring real round-trip latency.'}
      </p>
      {/* Passing our `data` state down as the `data` prop — PingChart has
          no idea this value changes over time; it just renders whatever
          it's given each time it's called, the same way any pure
          function would. */}
      <PingChart data={data} />
      {/* A plain, static <footer> — no state or props involved, so this
          is exactly as "just HTML" as it looks. Explains why these
          numbers read higher than `ping`, which measures something
          fundamentally cheaper (see the file-level note above
          measureLatencyMs for the `no-cors` side of this same story). */}
      <footer className="explainer">
        <p>
          Why do these numbers look higher than <code>ping</code>? System{' '}
          <code>ping</code> sends one raw ICMP packet and times the reply from
          the OS's network stack — no connection setup involved. This app
          measures an HTTPS <code>fetch()</code>, which on a cold connection
          also pays for a DNS lookup, a TCP handshake, and a TLS handshake
          before the request/response itself even starts, and the reply
          comes from the target's web server rather than its kernel. The
          first sample after pressing Start is discarded for exactly this
          reason — it is dominated by that one-time setup cost — but every
          later point still reflects an HTTP round trip, not a raw ICMP one,
          so it will typically stay several times slower than <code>ping</code>{' '}
          to the same host.
        </p>
      </footer>
    </main>
  )
}

export default App
