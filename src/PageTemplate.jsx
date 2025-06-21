// src/PageTemplateTable.jsx
import React from 'react'

export default function PageTemplateTable() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold text-center">
            Texas Poker Bot
          </h1>
        </header>

        {/* 2-column Intro & Swap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-3">Welcome</h2>
            <p>
              Welcome to Texas Poker Bot! Join live tables, view leaderboards,
              and track real-time stats. Connect your wallet to start playing.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow flex flex-col justify-between">
            <h2 className="text-2xl font-semibold mb-3">Swap & Wallet</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm">From</label>
                <input
                  type="text"
                  placeholder="Amount"
                  className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-indigo-500"
                />
                <label className="block text-sm">To (SOL)</label>
                <input
                  type="text"
                  placeholder="0.0 SOL"
                  className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-indigo-500"
                />
                <button className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 transition">
                  Swap
                </button>
              </div>
              <button className="w-full py-2 rounded bg-green-600 hover:bg-green-500 transition">
                Connect Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Centered Table Layout */}
        <div className="flex justify-center mb-12">
          <table className="table-auto border-separate border-spacing-x-8 border-spacing-y-8">
            <tbody>
              {/* Top Tables & Leaderboards */}
              <tr>
                <td>
                  <div className="bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-2xl font-bold mb-4">Top Tables</h2>
                    <ul className="list-disc list-inside space-y-2">
                      <li>
                        <a href="#" className="text-indigo-400 hover:underline">
                          Table 4 – 2 players
                        </a>
                      </li>
                      <li>
                        <a href="#" className="text-indigo-400 hover:underline">
                          Table 2 – 1 player
                        </a>
                      </li>
                    </ul>
                  </div>
                </td>
                <td>
                  <div className="bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-2xl font-bold mb-4">Leaderboards</h2>
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Alice – 500 credits</li>
                      <li>Bob – 350 credits</li>
                      <li>Carol – 300 credits</li>
                    </ol>
                  </div>
                </td>
              </tr>
              {/* Stats & FAQs */}
              <tr>
                <td>
                  <div className="bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-2xl font-bold mb-4">Platform Stats</h2>
                    <div className="space-y-2">
                      <div>Tables live: …</div>
                      <div>Players total: …</div>
                      <div>Total pot size: …</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-2xl font-bold mb-4">FAQs & Disclaimers</h2>
                    <dl className="space-y-4">
                      <div>
                        <dt className="font-semibold">Q: How do I join a table?</dt>
                        <dd className="ml-4">
                          Click a table link to open Telegram and type /start.
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold">Q: Is this real money?</dt>
                        <dd className="ml-4">No—in-platform credits only.</dd>
                      </div>
                    </dl>
                    <p className="mt-6 text-xs text-gray-400">
                      © 2025 Texas Poker Bot. All rights reserved.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}