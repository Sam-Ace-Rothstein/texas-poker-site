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

import {
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Connection,
  PublicKey
} from '@solana/web3.js';
import * as borsh from 'borsh';
import { Buffer } from 'buffer';
if (!window.Buffer) window.Buffer = Buffer;

class VaultInstruction {
  constructor(fields) {
         this.variant     = 0;        // 0 = Deposit
         this.amount      = fields.amount;
         this.telegram_id = fields.telegram_id;
       }
}

const VaultSchema = new Map([
  [VaultInstruction, {
    kind: 'struct',
    fields: [
      ['variant', 'u8'],
      ['amount', 'u64'],
      ['telegram_id', 'u64'],
    ]
  }]
]);

// ─────────────────────────────────────────────
// Combined display + withdraw logic component
function BalanceDisplay({ username }) {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [solBalance, setSolBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [depositAmountSol, setDepositAmountSol] = useState("0.1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [depositConfirmed, setDepositConfirmed] = useState(false);

  // Fetch SOL balance
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

  // Fetch gameplay token balance
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


  const handleDeposit = async () => {
    if (!publicKey || !username) {
      alert('Wallet or username not connected');
      return;
    }
  
    const depositAmount = Math.round(parseFloat(depositAmountSol) * 1e9);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      alert("Please enter a valid deposit amount.");
      return;
    }
    if (solBalance != null && parseFloat(depositAmountSol) > solBalance) {
      alert("You cannot deposit more SOL than your wallet balance.");
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      const programId = new PublicKey('AsS9H51TYVn97RY25Sv9kPKpBbgCe5BoAaV5rLbE5K5K');
      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("game_vault")],
        programId
      );
  
      const connection = new Connection(clusterApiUrl('devnet'));
      const telegramId = BigInt(username);
      const instruction = new TransactionInstruction({
        programId,
        keys: [
          { pubkey: publicKey,               isSigner: true,  isWritable: true  },
          { pubkey: vaultPDA,                isSigner: false, isWritable: true  },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(
          borsh.serialize(
            VaultSchema,
            new VaultInstruction({ amount: depositAmount, telegram_id: telegramId })
          )
        )
      });
  
      const tx = new Transaction().add(instruction);
      const latest = await connection.getLatestBlockhash();
      tx.recentBlockhash = latest.blockhash;
      tx.feePayer = publicKey;
  
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature, ...latest });
  
      // ✅ Show success UI
      setDepositConfirmed(true);
  
      // ⏳ Refresh token balance
      setTimeout(() => {
        fetch(`https://texas-poker-production.up.railway.app/api/telegram-balance?username=${username}`)
          .then(res => res.json())
          .then(data => setTokenBalance(data.tokens))
          .catch(err => console.error('🔁 Token balance refresh error', err));
      }, 1500);
  
      alert("✅ Deposit confirmed! Signature: " + signature);
    } catch (err) {
      console.error("❌ Deposit failed", err);
      alert("Deposit failed. See console for details.");
    } finally {
      setIsSubmitting(false);
    }
  }; // <-- make sure this closing brace is here

  // Handle Withdraw
  const handleWithdraw = async () => {
    if (!publicKey || !username || tokenBalance == null) {
      alert("Please connect your wallet and wait for balances to load.");
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
      alert("Voucher received! Proceed with on-chain claim.");
    } catch (err) {
      console.error("Voucher request failed:", err);
      alert("Error requesting voucher.");
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <p id="sol-balance">
        Total SOL: <strong>{solBalance != null ? solBalance.toFixed(4) : '…'}</strong>
      </p>
      <p id="token-balance">
        Total Tokens: <strong>{tokenBalance != null ? tokenBalance : '…'}</strong>
      </p>
  

      <div style={{ marginTop: '1rem' }}>
  <label>
    Amount to deposit (SOL):{" "}
    <input
  type="number"
  value={depositAmountSol}
  min="0"
  step="0.01"
  max={solBalance ?? undefined}
  onChange={(e) => setDepositAmountSol(e.target.value)}
  style={{ width: '6rem', padding: '0.25rem', fontSize: '1rem' }}
/>
  </label>
</div>


      {/* Deposit Button */}
      <button
  style={{
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    background: '#229',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: isSubmitting ? 'not-allowed' : 'pointer'
  }}
  onClick={handleDeposit}
  disabled={isSubmitting}
>
  {isSubmitting ? 'Depositing…' : 'Deposit SOL to Gameplay Tokens'}
</button>
  
      {/* Withdraw Button */}
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
    </div>
  );
}

// ─────────────────────────────────────────────
// Main App
const App = () => {
  const endpoint = clusterApiUrl('devnet');
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    // add more if needed
  ];

  const params = new URLSearchParams(window.location.search);
  const username = params.get('username');

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletMultiButton />
          <BalanceDisplay username={username} />
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