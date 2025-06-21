// src/Tables.jsx
import { useState, useEffect } from 'react'

const API_BASE     = import.meta.env.VITE_API_BASE || ''
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME

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

  if (err)     return <div className="text-red-500">Error: {err}</div>
  if (loading) return <div>Loading tables…</div>

  // Only show truly live tables (players > 0)
  const liveTables = tables.filter(t => t.players > 0)
  if (!liveTables.length)
    return <div>No active tables found.</div>

  return (
    <div className="mt-6 space-y-2">
      <h2 className="text-xl font-bold mb-2">Live Tables</h2>
      {liveTables.map(t => {
        const url = `https://t.me/${BOT_USERNAME}?startgroup=table_${t.id}`
        return (
          <a
            key={t.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gray-800 hover:bg-gray-700 p-3 rounded-lg shadow transition"
          >
            <span className="font-semibold">Table {t.id}:</span>{' '}
            {t.players}/{t.maxPlayers} players — pot {t.pot} — buy-in {t.buyIn}
          </a>
        )
      })}
    </div>
  )
}