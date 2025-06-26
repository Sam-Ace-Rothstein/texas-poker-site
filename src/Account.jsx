import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet
} from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles for the wallet adapter UI
import '@solana/wallet-adapter-react-ui/styles.css';

// Component to display on-chain SOL (via backend proxy) and in-bot token balances
function BalanceDisplay({ tgId }) {
  const { publicKey, connected } = useWallet();
  const [solBalance, setSolBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);

  // Fetch SOL balance via backend proxy when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetch(
        `https://texas-poker-production.up.railway.app/api/sol-balance?pubkey=${publicKey.toBase58()}`
      )
        .then(res => res.json())
        .then(data => setSolBalance(data.sol))
        .catch(err => console.error('🛠 sol-balance error', err));
    }
  }, [connected, publicKey]);

  // Fetch token balance from Telegram-bot API
  useEffect(() => {
    if (tgId) {
      fetch(
        `https://texas-poker-production.up.railway.app/api/telegram-balance?tgId=${tgId}`
      )
        .then(res => res.json())
        .then(data => setTokenBalance(data.tokens))
        .catch(err => console.error('🛠 token-balance error', err));
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
  const endpoint = clusterApiUrl('mainnet-beta');
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