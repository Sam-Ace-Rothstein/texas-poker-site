cat > texas-poker-site/src/components/Footer.jsx << 'EOF'
import React from 'react'

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-400 text-sm p-4 text-center">
      © {new Date().getFullYear()} Texas Poker Bot
    </footer>
  )
}
EOF