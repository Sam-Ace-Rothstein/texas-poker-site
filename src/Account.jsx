import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
  clusterApiUrl,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Connection,
  PublicKey,
  Ed25519Program,
} from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';
import * as borsh from 'borsh';
import { Buffer } from 'buffer';
if (!window.Buffer) window.Buffer = Buffer;

import BN from 'bn.js';
import bs58 from 'bs58';

// --- On-chain program & bot keys (fill in your real IDs) ---
const PROGRAM_ID     = new PublicKey("2mD9kYSmLfJVnroDQEjb71AM69PECUCTzkYgZRM4vin1");
const BOT_PUBLIC_KEY = new PublicKey("BOT_PUBLIC_KEY_HERE");

// ─────────────────────────────────────────────
// VaultInstruction definition (if needed elsewhere)

class VaultInstruction {
  constructor(fields) {
    this.variant = fields.variant;
    this.amount = fields.amount;
  }
}

const VaultSchema = new Map([
  [VaultInstruction, {
    kind: 'struct',
    fields: [
      ['variant', 'u8'],     // enum tag
      ['amount', 'u64'],     // only used for Deposit
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

// ─── Deposit Handler ─────────────────────────────────
const handleDeposit = async () => {
  if (!publicKey || !username) {
    alert('Wallet or username not connected');
    return;
  }

  const depositAmount = Math.round(parseFloat(depositAmountSol) * 1e9);
  if (isNaN(depositAmount) || depositAmount <= 0) {
    alert('Please enter a valid deposit amount.');
    return;
  }
  if (solBalance != null && parseFloat(depositAmountSol) > solBalance) {
    alert('You cannot deposit more SOL than your wallet balance.');
    return;
  }

  setIsSubmitting(true);

  try {
    const programId = new PublicKey(
      '2mD9kYSmLfJVnroDQEjb71AM69PECUCTzkYgZRM4vin1'
    );
    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault')],
      programId
    );

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const telegramId = BigInt(username);

    class DepositPayload {
      constructor(fields) {
        this.variant = fields.variant;
        this.amount = fields.amount;
        this.telegram_id = fields.telegram_id;
      }
    }
    const DepositSchema = new Map([
      [
        DepositPayload,
        {
          kind: 'struct',
          fields: [
            ['variant', 'u8'],
            ['amount', 'u64'],
            ['telegram_id', 'u64'],
          ],
        },
      ],
    ]);

    const depositData = Buffer.from(
      borsh.serialize(
        DepositSchema,
        new DepositPayload({
          variant: 1,
          amount: depositAmount,
          telegram_id: telegramId,
        })
      )
    );

    const instruction = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: depositData,
    });

    const tx = new Transaction().add(instruction);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;

    const sim = await connection.simulateTransaction(tx);
    if (sim.value.err) {
      alert('Simulation failed: ' + JSON.stringify(sim.value.err));
      return;
    }

    const signature = await sendTransaction(tx, connection);
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

    const conf = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    const logs = conf?.meta?.logMessages || [];
    const sawEvent = logs.find((l) => l.includes('DepositEvent:'));
    if (sawEvent) {
      setDepositConfirmed(true);
      setTimeout(() => {
        fetch(
          `https://texas-poker-production.up.railway.app/api/telegram-balance?username=${username}`
        )
          .then((r) => r.json())
          .then((d) => setTokenBalance(d.tokens))
          .catch((e) => console.error('🔁 Token refresh error', e));
      }, 1500);
      alert('✅ Deposit confirmed! Signature: ' + signature);
    } else {
      alert('Deposit failed on-chain: no confirmation event');
    }
  } catch (err) {
    console.error('❌ Deposit failed', err);
    alert('Deposit failed. See console for details.');
  } finally {
    setIsSubmitting(false);
  }
};
// ─────────────────────────────────────────────────────

  // Handle Withdraw
  const handleWithdraw = async () => {
    if (!publicKey || !username || tokenBalance == null) {
      alert("Please connect your wallet and wait for balances to load.");
      return;
    }
    const nonce = Date.now();
    // 1) Get voucher
    let voucher;
    try {
      const res = await fetch("https://texas-poker-production.up.railway.app/api/request-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
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
      voucher = data.voucher;
    } catch (err) {
      console.error("Voucher request failed:", err);
      alert("Error requesting voucher.");
      return;
    }

    // 2) Reconstruct signed message
    const msgBuf = Buffer.concat([
      publicKey.toBytes(),
      Buffer.from(new BN(tokenBalance).toArray('le', 8)),
      Buffer.from(new BN(nonce).toArray('le', 8)),
      Buffer.from(new BN(Number(username)).toArray('le', 8)),
    ]);

    // 3) Build ed25519 verify ix
    const verifyIx = Ed25519Program.createInstructionWithPublicKey({
      publicKey: BOT_PUBLIC_KEY.toBytes(),
      message:   msgBuf,
      signature: bs58.decode(voucher.signature),
    });

    // 4) Build Withdraw ix
    const withdrawData = Buffer.concat([
      Uint8Array.of(2), // Withdraw variant
      Buffer.from(new BN(tokenBalance).toArray('le', 8)),
      Buffer.from(new BN(nonce).toArray('le', 8)),
      Buffer.from(new BN(Number(username)).toArray('le', 8)),
      bs58.decode(voucher.signature),
    ]);
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const [vaultPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("vault")],
      PROGRAM_ID
    );
    const withdrawIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: publicKey, isSigner: true,  isWritable: true  },
        { pubkey: vaultPDA,  isSigner: false, isWritable: true  },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: withdrawData,
    });

    // 5) Send the combined tx
    try {
      const tx = new Transaction().add(verifyIx, withdrawIx);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
      alert("✅ Withdraw successful! Tx: " + signature);
    } catch (err) {
      console.error("Withdraw tx failed:", err);
      alert("Withdrawal failed: " + err.message);
    }
  };


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