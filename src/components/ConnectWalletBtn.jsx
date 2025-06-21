// src/ConnectWalletBtn.jsx
import React from 'react'

export default function ConnectWalletBtn({ className = '' }) {
  return (
    <button
      className={`${className} w-full py-2 rounded bg-green-600 hover:bg-green-500 transition`}
    >
      Connect Wallet
    </button>
  )
}