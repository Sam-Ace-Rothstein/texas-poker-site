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

import '@solana/wallet-adapter-react-ui/styles.css';

function BalanceDisplay({ solBalance, tokenBalance }) {
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
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
  const { publicKey, connected } = useWallet();

  const [solBalance, setSolBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const username = params.get('username');

  // Fetch SOL
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

  // Fetch Tokens
  useEffect(() => {
    if (username) {
      fetch(
        `https://texas-poker-production.up.railway.app/api/telegram-balance?username=${username}`
      )
        .then(res => res.json())
        .then(data => setTokenBalance(data.tokens))
        .catch(err => console.error('🛠 token-balance error', err));
    }
  }, [username]);

  const handleWithdraw = async () => {
    if (!publicKey || !username || !tokenBalance) {
      alert("Please connect your wallet and make sure token balance is loaded.");
      return;
    }

    const walletPubkey = publicKey.toBase58();
    const nonce = Date.now();

    try {
      const res = await fetch("https://texas-poker-production.up.railway.app/api/request-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: walletPubkey,
          username,
          amount: tokenBalance,
          nonce
        })
      });

      const data = await res.json();

      if (!data.success) {
        alert("Voucher rejected: " + data.error);
        return;
      }

      console.log("✅ Voucher received:", data.voucher);
      alert("Voucher received! Now send to smart contract.");

      // Optional: trigger transaction signing step here

    } catch (err) {
      console.error("Voucher request failed:", err);
      alert("Error requesting voucher.");
    }
  };

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletMultiButton />
          <BalanceDisplay solBalance={solBalance} tokenBalance={tokenBalance} />
          <button
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              background: '#2c2',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            onClick={handleWithdraw}
          >
            Withdraw Gameplay Tokens to SOL
          </button>
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