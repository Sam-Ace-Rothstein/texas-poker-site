import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
  useConnection
} from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Default styles for the wallet adapter UI
import '@solana/wallet-adapter-react-ui/styles.css';

// Component to display on-chain SOL and in-bot token balances
function BalanceDisplay({ tgId }) {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [solBalance, setSolBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);

  // Fetch SOL balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      connection.getBalance(publicKey)
        .then(lamports => setSolBalance(lamports / LAMPORTS_PER_SOL))
        .catch(console.error);
    }
  }, [connected, publicKey, connection]);

  // Fetch token balance from Telegram-bot API
  useEffect(() => {
    if (tgId) {
      fetch(`https://texas-poker-production.up.railway.app/api/telegram-balance?tgId=${tgId}`)
        .then(res => res.json())
        .then(data => setTokenBalance(data.tokens))
        .catch(console.error);
    }
  }, [tgId]);

  return (
    <div style={{ marginTop: '1rem' }}>
      <p id="sol-balance">
        Total SOL: <strong>{solBalance != null ? solBalance.toFixed(4) : '…'}</strong>
      </p>
      <p id="token-balance">
        Total Tokens: <strong>{tokenBalance != null ? tokenBalance : '…'}</strong>
      </p>
    </div>
  );
}

const App = () => {
  const endpoint = 'https://rpc.ankr.com/solana';
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    // Add more adapters here if desired
  ];

  // Read Telegram ID from URL query param (e.g., ?handle=...&username=...)
  const params = new URLSearchParams(window.location.search);
  const tgId = params.get('username');

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* Connect Wallet button */}
          <WalletMultiButton />
          {/* Display balances */}
          <BalanceDisplay tgId={tgId} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
} else {
  console.error('Root container not found');
}