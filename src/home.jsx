// src/Home.jsx
import React from 'react'
import Stats from './Stats'
import Tables from './Tables'
// import Leaderboard from './Leaderboard'
// import Faqs from './Faqs'
import SwapWidget from './SwapWidget'
import ConnectWalletBtn from './ConnectWalletBtn'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-5xl font-extrabold">Texas Poker Bot</h1>
        </header>

        {/* Intro & Swap/Wallet */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Welcome</h2>
            <p className="leading-relaxed">
              Jump into live poker tables, track leaderboards, and see real-time stats.
              Connect your wallet to start playing with $SOL.
            </p>
          </section>

          <section className="bg-gray-800 p-6 rounded-lg shadow flex flex-col justify-between">
            <h2 className="text-2xl font-semibold mb-4">Get Tokens</h2>
            <SwapWidget />
            <ConnectWalletBtn className="mt-6" />
          </section>
        </div>

        {/* Live Tables */}
<div className="mb-12">
  <section className="bg-gray-800 p-6 rounded-lg shadow">
    <h2 className="text-2xl font-bold mb-4">Live Tables</h2>
    <Tables />
  </section>
</div>

{/* Top Tables & Leaderboards */}
<div className="flex justify-center">
  <div className="w-full lg:w-4/5 grid grid-cols-1 md:grid-cols-2 gap-8">
    <section className="bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Top Tables</h2>
      {/* You could have a TopTables component or filter your Tables here */}
      <Tables />
    </section>
    <section className="bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Leaderboards</h2>
      {/* <Leaderboard /> */}
      <p className="text-gray-400">Coming soon…</p>
    </section>
  </div>
</div>

        {/* Stats */}
        <section className="bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Platform Stats</h2>
          <Stats />
        </section>

        {/* FAQs & Disclaimers */}
        <section className="bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">FAQs & Disclaimers</h2>
          {/* <Faqs /> */}
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold">Q: How do I join a table?</dt>
              <dd className="ml-4">Click a “Top Table” link to open Telegram and type <code>/start</code>.</dd>
            </div>
            <div>
              <dt className="font-semibold">Q: Is this real money?</dt>
              <dd className="ml-4">No — this uses in-platform $SOL credits only.</dd>
            </div>
          </dl>
          <p className="mt-6 text-xs text-gray-500">&copy; 2025 Texas Poker Bot</p>
        </section>
      </main>
    </div>
)
}