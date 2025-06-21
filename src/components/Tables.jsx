// src/components/Tables.jsx
import { useState, useEffect } from 'react'

const API_BASE     = import.meta.env.VITE_API_BASE || ''
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || ''

export default function Tables() {
  const [tables, setTables]   = useState([])
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/public-tables?threshold=0`)
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
  if (!tables.length)
    return <div>No public tables available.</div>

  // Only take the very first table
  const t = tables[0]
  const url = t.url || `https://t.me/${BOT_USERNAME}?startgroup=table_${t.id}`

  return (
    <div className="mt-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Public Tables (First Only)</h2>

      <div className="bg-gray-800 hover:bg-gray-700 p-4 rounded-lg shadow">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-white"
        >
          Table {t.id}: {t.players}/{t.maxPlayers} players — buy-in {t.buyIn} credits
        </a>
      </div>
    </div>
  )
}