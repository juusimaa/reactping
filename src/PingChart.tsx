import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PingDataPoint } from './types'

interface PingChartProps {
  data: PingDataPoint[]
}

function PingChart({ data }: PingChartProps) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis unit="ms" />
        <Tooltip formatter={(value) => [`${value} ms`, 'Latency']} />
        <Line
          type="monotone"
          dataKey="latencyMs"
          stroke="#2563eb"
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default PingChart
