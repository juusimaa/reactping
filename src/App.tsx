import { useEffect, useState } from 'react'
import PingChart from './PingChart'
import type { PingDataPoint } from './types'
import './App.css'

const POLL_INTERVAL_MS = 2000
const MAX_POINTS = 20

function randomLatencyMs() {
  return Math.round(15 + Math.random() * 40)
}

function nowLabel() {
  return new Date().toLocaleTimeString()
}

function App() {
  const [data, setData] = useState<PingDataPoint[]>(() => [
    { time: nowLabel(), latencyMs: randomLatencyMs() },
  ])

  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => {
        const next = [...prev, { time: nowLabel(), latencyMs: randomLatencyMs() }]
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
      })
    }, POLL_INTERVAL_MS)

    return () => clearInterval(id)
  }, [])

  return (
    <main className="app">
      <h1>Ping Latency</h1>
      <p className="subtitle">
        Live polling every {POLL_INTERVAL_MS / 1000}s (Step 3) &middot; fake latency values,
        rolling window of {MAX_POINTS} points
      </p>
      <PingChart data={data} />
    </main>
  )
}

export default App
