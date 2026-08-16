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

// Ordinary functions, same as private static helper methods in C#.
// Return types are inferred here (TypeScript figures out `number` and
// `string` from the function bodies) rather than written explicitly —
// you could write `function randomLatencyMs(): number {` but it's
// usually left off for simple cases like this.
function randomLatencyMs() {
  return Math.round(15 + Math.random() * 40)
}

function nowLabel() {
  return new Date().toLocaleTimeString()
}

function App() {
  // useState<PingDataPoint[]> — the `<...>` is a generic type argument,
  // same syntax and purpose as C#'s `List<PingDataPoint>`. It tells
  // TypeScript what type `data` will hold, since it can't be inferred
  // from a lazily-computed initial value (see below).
  //
  // Passing a FUNCTION `() => [...]` instead of the array directly is
  // deliberate: useState only needs the initial value once, on the very
  // first render. If we wrote `useState([{ time: nowLabel(), ... }])`
  // instead, `nowLabel()` and `randomLatencyMs()` would be re-evaluated
  // on every single re-render just to be thrown away (React ignores the
  // argument after the first call) — wasted work. Passing a function
  // defers that computation so it only runs once. This is a pattern
  // called "lazy initial state."
  //
  // Calling `setData` later does NOT mutate this array in place — it
  // tells React "here's the new value for this piece of state," which
  // triggers App to re-run (re-render) with `data` bound to the new
  // array. This is conceptually close to a bindable/observable property
  // in WPF/MVVM (like implementing INotifyPropertyChanged) — setting it
  // is what causes the UI to refresh, not the mutation itself.
  const [data, setData] = useState<PingDataPoint[]>(() => [
    { time: nowLabel(), latencyMs: randomLatencyMs() },
  ])

  // useEffect runs side effects (anything reaching outside of "compute
  // some UI from props/state") after React has rendered. Setting up a
  // timer is a classic example — it's not something you can express as
  // "just" a return value of the component function.
  //
  // The empty dependency array `[]` at the end means "run this setup
  // exactly once, when the component first mounts" — comparable to logic
  // you'd put in a constructor. If we listed variables inside the array
  // (e.g. `[someProp]`), the effect would re-run any time those specific
  // values changed between renders, sort of like a change-triggered
  // event handler. Get the dependency array wrong and you get stale
  // closures or infinite re-run loops — it's the single trickiest part
  // of learning React hooks.
  useEffect(() => {
    // setInterval here is the same Web API you'd use in vanilla JS —
    // no React-specific timer API exists. `id` is a handle we need later
    // to cancel it, similar to holding onto a System.Threading.Timer
    // instance so you can call Dispose() on it.
    const id = setInterval(() => {
      // Passing a FUNCTION to setData (`prev => next`), rather than a
      // plain value, is the safe way to update state based on the
      // previous state. Because this callback runs inside a setInterval
      // closure, `data` from the outer scope would otherwise be "stale"
      // — frozen at whatever it was when the effect first ran. Using the
      // updater-function form always gives you the true latest value.
      setData((prev) => {
        const next = [...prev, { time: nowLabel(), latencyMs: randomLatencyMs() }]
        // `[...prev, x]` is the spread operator — it copies all elements
        // of `prev` into a new array literal, then appends `x`. This is
        // the idiomatic way to add an item WITHOUT mutating the original
        // array (compare to `prev.Add(x)` in C#, which mutates in place —
        // that pattern is avoided in React because state is expected to
        // be treated as immutable/read-only once set).
        //
        // Trim to a rolling window of the last MAX_POINTS entries so the
        // chart doesn't grow forever.
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
      })
    }, POLL_INTERVAL_MS)

    // The function returned from useEffect is its "cleanup" function —
    // React calls it automatically when the component unmounts (or
    // before the effect re-runs, if the dependency array weren't empty).
    // This is the closest thing React has to C#'s IDisposable.Dispose():
    // it's how you avoid leaking the timer if this component were ever
    // removed from the page.
    return () => clearInterval(id)
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
        Live polling every {POLL_INTERVAL_MS / 1000}s (Step 3) &middot; fake latency values,
        rolling window of {MAX_POINTS} points
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
