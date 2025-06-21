// src/Tables.jsx
import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function Tables() {
  const [tables, setTables]   = useState([])
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/tables`)
      .then(r => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      })
      .then(data => {
        setTables(data)
        setLoading(false)
      })
      .catch(e => {
        setErr(e.message)
        setLoading(false)
      })
  }, [])

  if (err)     return <div className="text-red-600">Error: {err}</div>
  if (loading) return <div>Loading tables…</div>
  if (!tables.length) return <div>No active tables found.</div>

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-2">Live Tables</h2>
      <ul className="space-y-4">
        {tables.map(t => (
          <li
            key={t.id}
            className="bg-gray-800 p-4 rounded-lg shadow flex flex-col space-y-1"
          >
            <h3 className="text-lg font-semibold">Table {t.id}</h3>
            <p>Players: {t.players} / {t.maxPlayers}</p>
            <p>Pot: {t.pot} credits</p>
            <p>Buy-in: {t.buyIn} credits</p>
          </li>
        ))}
      </ul>
    </div>
  )
}