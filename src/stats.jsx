// src/Stats.jsx
import { useState, useEffect } from 'react'

// Use the production base URL if set, otherwise proxy to localhost in dev
const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function Stats() {
  const [data, setData]   = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(res => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
  }, [])

  if (error) return <div className="text-red-600">Error loading stats: {error}</div>
  if (!data)  return <div>Loading stats…</div>

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-bold">Platform Overview</h2>
      <ul className="list-disc list-inside">
        <li>Total Tables: {data.totalTables}</li>
        <li>Total Players: {data.totalPlayers}</li>
        <li>Total Pots: {data.totalPot}</li>
      </ul>
    </div>
  )
}