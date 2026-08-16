import PingChart from './PingChart'
import type { PingDataPoint } from './types'
import './App.css'

const fakeData: PingDataPoint[] = [
  { time: '10:00:00', latencyMs: 24 },
  { time: '10:00:05', latencyMs: 19 },
  { time: '10:00:10', latencyMs: 31 },
  { time: '10:00:15', latencyMs: 22 },
  { time: '10:00:20', latencyMs: 45 },
  { time: '10:00:25', latencyMs: 18 },
  { time: '10:00:30', latencyMs: 27 },
]

function App() {
  return (
    <main className="app">
      <h1>Ping Latency</h1>
      <p className="subtitle">Static chart with hardcoded data (Step 2)</p>
      <PingChart data={fakeData} />
    </main>
  )
}

export default App
