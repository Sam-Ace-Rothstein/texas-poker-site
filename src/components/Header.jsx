cat > texas-poker-site/src/components/Header.jsx << 'EOF'
import React from 'react'

export default function Header() {
  return (
    <header className="bg-gray-800 text-white p-6 text-center">
      <h1 className="text-4xl font-bold">Texas Poker Bot</h1>
    </header>
  )
}
EOF