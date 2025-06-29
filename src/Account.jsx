import React, { useState, useEffect } from 'react';
import bs58 from 'bs58';
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

import { SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';

import { Ed25519Program } from '@solana/web3.js';

import BN from 'bn.js'; 

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
  console.log("🌱 VITE_VAULT_PROGRAM_ID:", import.meta.env.VITE_VAULT_PROGRAM_ID)
console.log("🌱 VITE_BOT_PUBKEY:      ", import.meta.env.VITE_BOT_PUBKEY)
console.log("🌱 VITE_TREASURY_PUBKEY: ", import.meta.env.VITE_TREASURY_PUBKEY)
  const { publicKey, connected, sendTransaction } = useWallet();
  const [solBalance, setSolBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [depositAmountSol, setDepositAmountSol] = useState("0.1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("0");
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
    alert("Please enter a valid deposit amount.");
    return;
  }
  if (solBalance != null && parseFloat(depositAmountSol) > solBalance) {
    alert("You cannot deposit more SOL than your wallet balance.");
    return;
  }

  setIsSubmitting(true);

  try {
    const programId = new PublicKey(import.meta.env.VITE_VAULT_PROGRAM_ID);
    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],    // matches GAME_VAULT_SEED = b"vault"
      programId
    );
    console.log("🔐 PDA:", vaultPDA.toBase58());

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const telegramId = BigInt(username);

    // — Build payload matching `enum VaultInstruction::Deposit { amount, telegram_id }`
    class DepositPayload {
      constructor(fields) {
        this.variant     = fields.variant;      // 1 = Deposit
        this.amount      = fields.amount;       // u64
        this.telegram_id = fields.telegram_id;  // u64
      }
    }
    const DepositSchema = new Map([
      [DepositPayload, {
        kind: 'struct',
        fields: [
          ['variant',     'u8'],
          ['amount',      'u64'],
          ['telegram_id', 'u64'],
        ]
      }]
    ]);

    const depositData = Buffer.from(
      borsh.serialize(
        DepositSchema,
        new DepositPayload({
          variant: 1,
          amount: depositAmount,
          telegram_id: telegramId
        })
      )
    );

    const instruction = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: publicKey,               isSigner: true,  isWritable: true  }, // signer
        { pubkey: vaultPDA,                isSigner: false, isWritable: true  }, // vault PDA
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: depositData
    });

    // Build & simulate
    const tx = new Transaction().add(instruction);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer      = publicKey;

    const sim = await connection.simulateTransaction(tx);
    console.log("📡 Simulation logs:", sim.value.logs);
    if (sim.value.err) {
      console.error("❌ Simulation error:", sim.value.err);
      alert("Simulation failed: " + JSON.stringify(sim.value.err));
      return;
    }

    // Send & confirm
    const signature = await sendTransaction(tx, connection);
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

    // Check on-chain logs
    const conf = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });
    const logs = conf?.meta?.logMessages || [];
    console.log("🪵 On-chain logs:", logs);

    const sawEvent = logs.find(l => l.includes("DepositEvent:"));
    if (sawEvent) {
      console.log("✅ DepositEvent found:", sawEvent);
      setDepositConfirmed(true);
      // refresh token balance
      setTimeout(() => {
        fetch(`https://texas-poker-production.up.railway.app/api/telegram-balance?username=${username}`)
          .then(r => r.json())
          .then(d => setTokenBalance(d.tokens))
          .catch(e => console.error('🔁 Token refresh error', e));
      }, 1500);
      alert("✅ Deposit confirmed! Signature: " + signature);
    } else {
      console.warn("⚠️ DepositEvent missing in logs");
      alert("Deposit failed on-chain: no confirmation event");
    }

  } catch (err) {
    console.error("❌ Deposit failed", err);
    alert("Deposit failed. See console for details.");
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

  // Parse and validate user‐entered withdraw amount
  const amount = parseInt(withdrawAmount, 10);
  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid token amount to withdraw.");
    return;
  }
  if (amount > tokenBalance) {
    alert("Cannot withdraw more than your total tokens.");
    return;
  }

  setIsSubmitting(true);
  const walletPubkey = publicKey.toBase58();
  // Use UNIX‐seconds timestamp for on‐chain expiry check
  const nonce = Math.floor(Date.now() / 1000);

  try {
    // 1) Request server‐signed voucher
    const res = await fetch(
      "https://texas-poker-production.up.railway.app/api/request-voucher",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: walletPubkey,
          username,
          amount,
          nonce
        })
      }
    );
    const data = await res.json();
    if (!data.success) {
      alert("Voucher rejected: " + data.error);
      return;
    }
    const voucher = data.voucher;
    console.log("✅ Voucher received:", voucher);

    // 2) Prepare on-chain program and PDAs
    const programId = new PublicKey(import.meta.env.VITE_VAULT_PROGRAM_ID);
    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      programId
    );
    const treasuryPubkey = new PublicKey(import.meta.env.VITE_TREASURY_PUBKEY);
    const [userVaultAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), publicKey.toBuffer()],
      programId
    );

    // 3) Decode signature and build message
    const sigBytes = bs58.decode(voucher.signature);
    const message = Buffer.concat([
      publicKey.toBuffer(),
      Buffer.from(new BN(voucher.amount).toArray('le', 8)),
      Buffer.from(new BN(voucher.nonce).toArray('le', 8)),
      Buffer.from(new BN(username).toArray('le', 8)),
    ]);

    // 4) Create ed25519 verification instruction (index 0)
    const verifyIx = Ed25519Program.createInstructionWithPublicKey({
      publicKey: bs58.decode(import.meta.env.VITE_BOT_PUBKEY),
      message,
      signature: sigBytes
    });

    // 5) Build withdraw data struct
    class WithdrawPayload {
      constructor(f) {
        this.variant     = f.variant;     // 2 = Withdraw
        this.amount      = f.amount;      // u64
        this.nonce       = f.nonce;       // u64
        this.telegram_id = f.telegram_id; // u64
        this.signature   = f.signature;   // [u8;64]
      }
    }
    const WithdrawSchema = new Map([
      [WithdrawPayload, {
        kind: "struct",
        fields: [
          ['variant',     'u8'],
          ['amount',      'u64'],
          ['nonce',       'u64'],
          ['telegram_id', 'u64'],
          ['signature',   [64]],
        ]
      }]
    ]);
    const withdrawData = Buffer.from(
      borsh.serialize(
        WithdrawSchema,
        new WithdrawPayload({
          variant:     2,
          amount:      BigInt(voucher.amount),
          nonce:       BigInt(voucher.nonce),
          telegram_id: BigInt(username),
          signature:   sigBytes
        })
      )
    );

    // 6) Create withdraw instruction (index 1)
    const withdrawIx = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: publicKey,               isSigner: true,  isWritable: true  },
        { pubkey: vaultPDA,                isSigner: false, isWritable: true  },
        { pubkey: treasuryPubkey,          isSigner: false, isWritable: true  },
        { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: userVaultAccount,        isSigner: false, isWritable: true  },
      ],
      data: withdrawData
    });

    // 7) Assemble, simulate, and send transaction
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const tx = new Transaction()
  .add(verifyIx)
  .add(withdrawIx);

// 1) Set fee payer & recent blockhash
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
tx.recentBlockhash = blockhash;
tx.feePayer       = publicKey;

// 2) Simulate without any extra config (this signature is the only valid overload)
const sim = await connection.simulateTransaction(tx);
console.log("💡 Withdraw simulation logs:", sim.value.logs);
if (sim.value.err) {
  console.error("❌ Preflight error:", sim.value.err);
  alert("Withdraw simulation failed:\n" + JSON.stringify(sim.value.err));
  setIsSubmitting(false);
  return;
}

// 3) Now that sim passed, send & confirm
const sig = await sendTransaction(tx, connection);
await connection.confirmTransaction(
  { signature: sig, blockhash, lastValidBlockHeight },
  'confirmed'
);

alert("✅ Withdraw confirmed! Signature: " + sig);
return;
}

// 3) Now send & confirm for real
const sig = await sendTransaction(tx, connection);
await connection.confirmTransaction(
  { signature: sig, blockhash, lastValidBlockHeight },
  'confirmed'
);

alert("✅ Withdraw confirmed! Signature: " + sig);
return;

  } catch (err) {
    console.error("Withdraw failed:", err);
    alert("Withdraw failed: " + (err.message || err));
  } finally {
    setIsSubmitting(false);
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
    Amount to deposito (SOL):{" "}
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

<div style={{ marginTop: '1rem' }}>
        <label>
          Amount to burn (tokens):{" "}
          <input
            type="number"
            value={withdrawAmount}
            min="1"
            step="1"
            max={tokenBalance ?? undefined}
            onChange={e => setWithdrawAmount(e.target.value)}
            style={{ width: '6rem', padding: '0.25rem', fontSize: '1rem' }}
          />
        </label>
      </div>
  
      {/* Withdraw Button */}
      <button
         disabled={isSubmitting}
         style={{
           marginTop: '1rem',
           padding: '0.5rem 1rem',
           fontSize: '1rem',
           fontWeight: 'bold',
           background: '#2c2',
           color: '#fff',
           border: 'none',
           borderRadius: '6px',
           cursor: isSubmitting ? 'not-allowed' : 'pointer'
         }}
         onClick={handleWithdraw}
       >
         {isSubmitting ? 'Withdrawing…' : 'Withdraw Gameplay Tokens to SOL'}
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