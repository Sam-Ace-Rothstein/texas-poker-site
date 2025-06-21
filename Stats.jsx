// src/Stats.jsx
import { useState, useEffect } from 'react'

export default function Stats() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/stats')
      .then(res => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
  }, [])

  if (error) return <div>Error loading stats: {error}</div>
  if (!data) return <div>Loading stats…</div>

  return (
    <div>
      <h2>Platform Overview</h2>
      <ul>
        <li>Tables live: {data.totalTables}</li>
        <li>Players total: {data.totalPlayers}</li>
        <li>Total pot size: {data.totalPot}</li>
      </ul>
    </div>
  )
}