// `useState` and `useEffect` are "hooks" — plain functions from React
// that only work when called directly inside a function component (not
// inside loops/conditions/nested functions). There's no real C# analog;
// the closest mental model is that React secretly keeps a per-component
// slot of memory, and calling useState() "checks out" the next slot in
// that memory, in the exact order you call it every time the component
// runs. That's why hook call order must stay identical between renders.
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import PingChart from './PingChart'
import SessionList from './SessionList'
import type { PingDataPoint, PingSession } from './types'
import './App.css'

// Module-level `const` — evaluated once when the file is first loaded,
// same idea as a C# `static readonly` field, just without a class
// wrapping it (JS/TS modules don't require everything to live in a class).
const POLL_INTERVAL_MS = 2000
const MAX_POINTS = 20

function nowLabel() {
  return new Date().toLocaleTimeString()
}

// The user types a bare host ("example.com") but might paste a full URL
// instead ("https://example.com/some/path") — the /api/ping Function only
// wants a bare hostname, so strip an optional scheme and anything after
// the host (a path, port, etc.) rather than sending it along.
function hostFromInput(input: string) {
  return input.trim().replace(/^https?:\/\//i, '').split(/[/:]/)[0]
}

// Delegates the actual timing to our own /api/ping Azure Function (see
// api/src/functions/ping.ts), which opens a raw TCP connection to
// `host:443` and times the handshake — rather than the browser measuring
// its own fetch to an arbitrary host directly.
//
// That old approach needed `fetch(url, { mode: 'no-cors' })`: most of the
// internet doesn't send the `Access-Control-Allow-Origin` header a normal
// cross-origin fetch needs, so the browser would block reading the
// response entirely. `no-cors` worked around that, but only by making the
// response opaque — no real status, no way to tell "the host responded
// with an error" from "the host is unreachable."
//
// Calling `/api/ping` instead is a same-origin request (it's served by
// our own Static Web App), so this is a completely ordinary `fetch()`
// with a real, readable JSON response — the Function is the one reaching
// out to the arbitrary host, not the browser.
async function measureLatencyMs(host: string) {
  try {
    const response = await fetch(`/api/ping?host=${encodeURIComponent(host)}`, { cache: 'no-store' })
    const result: { ok: boolean; latencyMs?: number } = await response.json()
    return result.ok && typeof result.latencyMs === 'number' ? result.latencyMs : null
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

  // `targetHost` is deliberately a SEPARATE piece of state from
  // `hostInput`, only written by handleStart. If the effect below instead
  // depended on `hostInput` directly, every keystroke would restart
  // polling against a half-typed hostname. Splitting "what's in the box"
  // from "what we're actually polling" is what lets Start act like a
  // commit/confirm step.
  const [targetHost, setTargetHost] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  // Completed Start→Stop runs, newest first, shown in the table below the
  // chart. This is genuinely separate from `data`: `data` is trimmed to a
  // rolling window of MAX_POINTS for the chart, but a session's min/max/avg
  // needs to reflect every sample from the whole run, not just whatever
  // happens to still be on screen.
  const [sessions, setSessions] = useState<PingSession[]>([])

  // Two plain `useRef`s (not `useState`) tracking the in-progress session,
  // for the same reason `cancelled`/`isFirstPoll` inside the polling effect
  // aren't state further down: nothing on screen depends on these values
  // directly, they're just bookkeeping read once, at Stop time, so they
  // don't need to trigger a re-render on every update. `.current` is a
  // ref's one mutable field — the closest analogy is a plain field on a
  // long-lived object, rather than a bindable UI property like state.
  const sessionStartRef = useRef<number | null>(null)
  const sessionLatenciesRef = useRef<number[]>([])

  function handleStart(event: FormEvent) {
    // <form onSubmit> fires on both a Start button click and pressing
    // Enter in the input — preventDefault stops the browser's default
    // "navigate to this URL" full-page-reload behavior for form submits.
    event.preventDefault()
    if (!hostInput.trim()) return
    setData([]) // clear the chart so old and new hosts don't mix on one line
    setTargetHost(hostFromInput(hostInput))
    sessionStartRef.current = Date.now()
    sessionLatenciesRef.current = []
    setIsRunning(true)
  }

  function handleStop() {
    setIsRunning(false)

    const latencies = sessionLatenciesRef.current
    // Skip recording a session if Stop is pressed before any real sample
    // came back (e.g. right after Start, while only the discarded warm-up
    // request has fired) — there'd be nothing meaningful to average.
    if (targetHost && sessionStartRef.current !== null && latencies.length > 0) {
      const session: PingSession = {
        id: crypto.randomUUID(),
        targetHost,
        durationMs: Date.now() - sessionStartRef.current,
        avgLatencyMs: Math.round(
          latencies.reduce((sum, latencyMs) => sum + latencyMs, 0) / latencies.length,
        ),
        minLatencyMs: Math.min(...latencies),
        maxLatencyMs: Math.max(...latencies),
      }
      // Prepend rather than append so the most recently finished session
      // shows up at the top of the table instead of the bottom.
      setSessions((prev) => [session, ...prev])
    }
  }

  // useEffect runs side effects (anything reaching outside of "compute
  // some UI from props/state") after React has rendered. Setting up a
  // timer is a classic example — it's not something you can express as
  // "just" a return value of the component function.
  //
  // The dependency array now lists `isRunning` and `targetHost` instead of
  // being empty: this effect re-runs (tearing down the old timer via
  // cleanup, then setting up a new one) whenever either changes — i.e.
  // whenever Start or Stop is clicked. That's the whole mechanism behind
  // the buttons; there's no separate "timer control" API being called.
  useEffect(() => {
    // Stopped, or nothing has ever been started yet — do nothing, and
    // skip straight to the (no-op) cleanup below.
    if (!isRunning || !targetHost) return

    // `cancelled` guards against setting state after this effect's
    // cleanup has run — e.g. a slow fetch resolving after Stop was
    // clicked, or (in React 18 StrictMode's dev-only double-invoke) after
    // the first mount/cleanup pair. Closest C# analogy: checking a
    // CancellationToken before touching shared state.
    let cancelled = false

    // Every poll now opens a brand-new TCP socket from the Azure Function
    // (that's the point — it's what's actually being timed), so there's
    // no browser-side connection reuse left to amortize away like there
    // was before. The one-time cost worth discarding now is different:
    // if the Function has been idle, this first invocation pays Azure's
    // Consumption-plan cold-start cost on top of the real TCP time, which
    // would make the first sample look misleadingly slow compared to
    // every later one. `isFirstPoll` is a plain closure variable rather
    // than state because updating it should never trigger a re-render —
    // same reasoning as `cancelled` above.
    let isFirstPoll = true

    // setInterval's callback can't itself be `async` — setInterval just
    // ignores whatever value it returns — so we define a normal async
    // function and call it, both once immediately and on every tick.
    async function poll() {
      const latencyMs = await measureLatencyMs(targetHost!)
      if (cancelled || latencyMs === null) return
      if (isFirstPoll) {
        // Warm the connection and discard the reading; only flip this
        // once a measurement actually succeeds, so a failed warm-up
        // attempt (e.g. transient DNS error) doesn't leave the real first
        // sample discarded too.
        isFirstPoll = false
        return
      }
      // Recorded here, outside of state, so the full-session stats in the
      // table below survive the chart's rolling-window trim (below) —
      // this array keeps every sample for the whole run, uncapped.
      sessionLatenciesRef.current.push(latencyMs)
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
  }, [isRunning, targetHost])

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
        {isRunning && targetHost
          ? `Live polling every ${POLL_INTERVAL_MS / 1000}s · server-measured TCP connect time to ${targetHost}, rolling window of ${MAX_POINTS} points`
          : 'Type a host above and press Start to begin measuring real round-trip latency.'}
      </p>
      {/* Passing our `data` state down as the `data` prop — PingChart has
          no idea this value changes over time; it just renders whatever
          it's given each time it's called, the same way any pure
          function would. */}
      <PingChart data={data} />
      <h2>Session history</h2>
      {/* Passing `sessions` down the same way `data` is passed to
          PingChart above — SessionList is just another pure function of
          whatever it's given, with no awareness of state or timers. */}
      <SessionList sessions={sessions} />
      {/* A plain, static <footer> — no state or props involved, so this
          is exactly as "just HTML" as it looks. Explains why these
          numbers still read higher than `ping`, even though the
          measurement moved server-side (see the file-level note above
          measureLatencyMs for why it now calls /api/ping at all). */}
      <footer className="explainer">
        <p>
          Why do these numbers look higher than <code>ping</code>? System{' '}
          <code>ping</code> sends one raw ICMP packet and times the reply from
          the OS's network stack. This app instead times a TCP handshake —
          measured server-side, by an Azure Function connecting to the
          target on port 443, rather than the browser measuring its own
          request — which is lighter than a full HTTPS request but still
          heavier than ICMP: no packet round trip alone, but a real
          three-way TCP handshake (SYN, SYN-ACK, ACK) that a raw ping never
          has to do. Each poll also crosses two networks instead of one —
          your browser to the Azure Function, then the Function to the
          target — so this number is closer to <code>ping</code> than the
          old in-browser measurement was, but still not identical to it.
        </p>
      </footer>
    </main>
  )
}

export default App
