// `useState` and `useEffect` are "hooks" — plain functions from React
// that only work when called directly inside a function component (not
// inside loops/conditions/nested functions). There's no real C# analog;
// the closest mental model is that React secretly keeps a per-component
// slot of memory, and calling useState() "checks out" the next slot in
// that memory, in the exact order you call it every time the component
// runs. That's why hook call order must stay identical between renders.
import { useEffect, useState } from 'react'
import PingChart from './PingChart'
import type { PingDataPoint } from './types'
import './App.css'

// Module-level `const` — evaluated once when the file is first loaded,
// same idea as a C# `static readonly` field, just without a class
// wrapping it (JS/TS modules don't require everything to live in a class).
const POLL_INTERVAL_MS = 2000
const MAX_POINTS = 20

// A CORS-friendly endpoint: httpbin.org replies with
// `Access-Control-Allow-Origin: *`, so the browser lets our `fetch()` read
// the response instead of blocking it as cross-origin. That's what lets us
// use the default `cors` mode (rather than the more limited `no-cors`
// mode) and check `response.ok` below.
const TARGET_URL = 'https://httpbin.org/get'

function nowLabel() {
  return new Date().toLocaleTimeString()
}

// Times one real round trip to TARGET_URL using performance.now() —
// a high-resolution, monotonic clock meant exactly for measuring elapsed
// time, unlike Date.now() (which can jump if the system clock changes).
// Returns null if the request fails (offline, DNS error, non-2xx status,
// etc.) so the caller can decide what to do instead of recording a bogus
// number. `cache: 'no-store'` stops the browser from serving a cached
// response, which would time a memory lookup rather than a network trip.
async function measureLatencyMs() {
  const start = performance.now()
  try {
    const response = await fetch(TARGET_URL, { cache: 'no-store' })
    if (!response.ok) return null
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

  // useEffect runs side effects (anything reaching outside of "compute
  // some UI from props/state") after React has rendered. Setting up a
  // timer is a classic example — it's not something you can express as
  // "just" a return value of the component function.
  //
  // The empty dependency array `[]` at the end means "run this setup
  // exactly once, when the component first mounts" — comparable to logic
  // you'd put in a constructor.
  useEffect(() => {
    // `cancelled` guards against setting state after this effect's
    // cleanup has run — e.g. a slow fetch resolving after the component
    // unmounted, or (in React 18 StrictMode's dev-only double-invoke)
    // after the first mount/cleanup pair. Closest C# analogy: checking a
    // CancellationToken before touching shared state.
    let cancelled = false

    // setInterval's callback can't itself be `async` — setInterval just
    // ignores whatever value it returns — so we define a normal async
    // function and call it, both once immediately and on every tick.
    async function poll() {
      const latencyMs = await measureLatencyMs()
      if (cancelled || latencyMs === null) return
      setData((prev) => {
        const next = [...prev, { time: nowLabel(), latencyMs }]
        // Trim to a rolling window of the last MAX_POINTS entries so the
        // chart doesn't grow forever.
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
      })
    }

    poll() // get the first point right away instead of waiting a full interval
    const id = setInterval(poll, POLL_INTERVAL_MS)

    // The function returned from useEffect is its "cleanup" function —
    // React calls it automatically when the component unmounts (or
    // before the effect re-runs, if the dependency array weren't empty).
    // This is the closest thing React has to C#'s IDisposable.Dispose().
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // The JSX returned here is re-evaluated every time `data` changes
  // (because setData was called), producing a new description of what
  // the UI should look like. React then diffs that against what's
  // currently on screen and patches only what changed — you never
  // manually touch the DOM yourself, unlike raw JS or a WinForms
  // `control.Text = "..."` assignment.
  return (
    <main className="app">
      <h1>Ping Latency</h1>
      <p className="subtitle">
        {/* Curly braces embed real TypeScript expressions inside JSX —
            here, simple arithmetic and string interpolation. */}
        Live polling every {POLL_INTERVAL_MS / 1000}s (Step 4) &middot; real fetch()
        round-trip time to {TARGET_URL}, rolling window of {MAX_POINTS} points
      </p>
      {/* Passing our `data` state down as the `data` prop — PingChart has
          no idea this value changes over time; it just renders whatever
          it's given each time it's called, the same way any pure
          function would. */}
      <PingChart data={data} />
    </main>
  )
}

export default App
