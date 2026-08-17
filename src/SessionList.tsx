import type { PingSession } from './types'

interface SessionListProps {
  sessions: PingSession[]
}

// Formats a millisecond duration as "1m 24s" (or just "24s" under a
// minute) rather than showing raw milliseconds, which would be accurate
// but unreadable for a session that ran for several minutes.
function formatDuration(ms: number) {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

// Renders completed ping sessions as a table, newest first (App.tsx
// prepends each finished session to the front of the array, so no
// sorting needs to happen here).
function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="session-empty">
        No completed sessions yet — press Stop after a run to see it listed here.
      </p>
    )
  }

  return (
    <table className="session-list">
      <thead>
        <tr>
          <th>Target</th>
          <th>Duration</th>
          <th>Avg</th>
          <th>Min</th>
          <th>Max</th>
        </tr>
      </thead>
      <tbody>
        {/* .map() is JSX's version of a loop — there's no <for> tag; you
            express "one row per session" by mapping data to elements
            instead. `key` isn't a real prop on <tr>; React reads and
            strips it to track which row is which across re-renders
            (e.g. when a new session gets prepended), instead of
            diffing rows by their array position alone. */}
        {sessions.map((session) => (
          <tr key={session.id}>
            <td>{session.targetUrl}</td>
            <td>{formatDuration(session.durationMs)}</td>
            <td>{session.avgLatencyMs} ms</td>
            <td>{session.minLatencyMs} ms</td>
            <td>{session.maxLatencyMs} ms</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default SessionList
