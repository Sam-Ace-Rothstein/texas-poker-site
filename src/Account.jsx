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
import {
  clusterApiUrl,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Connection,
  PublicKey,
  SendTransactionError,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Ed25519Program
} from '@solana/web3.js';

import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import '@solana/wallet-adapter-react-ui/styles.css';

import BN from 'bn.js';
import * as borsh from 'borsh';
import { Buffer } from 'buffer';
if (!window.Buffer) window.Buffer = Buffer;

// ── Voucher withdraw payload/schema (needed by handleClaim) ──
class WithdrawPayload {
  constructor(fields) {
    this.variant     = fields.variant;
    this.amount      = fields.amount;
    this.nonce       = fields.nonce;
    this.telegram_id = fields.telegram_id;
    this.signature   = fields.signature;
  }
}
const WithdrawSchema = new Map([
  [WithdrawPayload, {
    kind: 'struct',
    fields: [
      ['variant',     'u8'],
      ['amount',      'u64'],
      ['nonce',       'u64'],
      ['telegram_id', 'u64'],
      ['signature',   [64]],
    ],
  }]
]);

export default function TransactionTable({ username, refreshSignal }) {
  const { publicKey, sendTransaction } = useWallet();
  const [transactions, setTransactions] = useState([]);

//—you’ll also need these two in this file:—
   class WithdrawPayload {
       constructor(f) {
         this.variant     = f.variant;
         this.amount      = f.amount;
         this.nonce       = f.nonce;
         this.telegram_id = f.telegram_id;
         this.signature   = f.signature;
       }
     }
     const WithdrawSchema = new Map([
       [WithdrawPayload, {
         kind: "struct",
         fields: [
           ["variant",     "u8"],
           ["amount",      "u64"],
           ["nonce",       "u64"],
           ["telegram_id", "u64"],
           ["signature",   [64]],
         ],
       }],
     ]);
   
     // build & send the “claim” tx on‐chain
const handleClaim = async (tx) => {
  if (!publicKey) return toast.error("Connect wallet first");

  // 1) fetch signed voucher from your API
  const resp = await fetch(
    "https://texas-poker-production.up.railway.app/api/claim-voucher",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, nonce: tx.nonce }),
    }
  );
  const { success, voucher, error } = await resp.json();
  if (!success) {
    return toast.error("❌ Could not fetch voucher: " + error);
  }

  // 2) unpack
  const { amount, nonce, signature: sigB58 } = voucher;
  const sigBytes = bs58.decode(sigB58);

  // …then the rest of your on-chain logic exactly as before, using sigBytes…

  const programId      = new PublicKey(import.meta.env.VITE_VAULT_PROGRAM_ID);
  const [vaultPDA]     = PublicKey.findProgramAddressSync([Buffer.from("vault_v2")], programId);
  const treasuryPubkey = new PublicKey(import.meta.env.VITE_TREASURY_PUBKEY);

  const msgBuf = Buffer.concat([
    publicKey.toBuffer(),
    Buffer.from(new BN(amount).toArray("le", 8)),
    Buffer.from(new BN(nonce).toArray("le", 8)),
    Buffer.from(new BN(parseInt(username, 10)).toArray("le", 8)),
  ]);

  const verifyIx = Ed25519Program.createInstructionWithPublicKey({
    publicKey: bs58.decode(import.meta.env.VITE_BOT_PUBKEY),
    message:   msgBuf,
    signature: sigBytes,
  });

  const withdrawData = Buffer.from(
    borsh.serialize(
      WithdrawSchema,
      new WithdrawPayload({ variant: 2, amount: BigInt(amount), nonce: BigInt(nonce),
                            telegram_id: BigInt(parseInt(username, 10)), signature: sigBytes })
    )
  );

  const [userVaultAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), publicKey.toBuffer()],
    programId
  );
  
  const withdrawIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: publicKey,               isSigner: true,  isWritable: true  },
      { pubkey: vaultPDA,                isSigner: false, isWritable: true  },
      { pubkey: treasuryPubkey,          isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: userVaultAccount,        isSigner: false, isWritable: true  },  // ← add this
    ],
    data: withdrawData,
  });

  // assemble & send…
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const txObj = new Transaction().add(verifyIx, withdrawIx);
  txObj.feePayer = publicKey;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  txObj.recentBlockhash = blockhash;

  try {
    const sig = await sendTransaction(txObj, connection);
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
    setTransactions(txs =>
      txs.map(t => t.nonce === nonce ? { ...t, status: "completed", txid: sig } : t)
    );

    toast.success("✅ Voucher claimed on-chain", { autoClose: 4000 });
  } catch (e) {
    console.error("Claim failed", e);
    toast.error("❌ Claim failed: " + (e.message || "Unknown error"));
  }
};
  
    useEffect(() => {
      if (!username) return;
      fetch(`https://texas-poker-production.up.railway.app/api/transactions?username=${username}`)
        .then(res => res.json())
        .then(data => setTransactions(data.transactions || []))
        .catch(err => console.error(err));
    }, [username, refreshSignal]);  // ← now re-runs on every new transaction
  
    if (!username) return null;

    return (
      <div style={{ backgroundColor: '#121212', padding: '2rem', borderRadius: '12px' }}>
        {/* Buy / Sell Token Boxes */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '2rem',
            marginBottom: '2rem',
          }}
        >
          {/* Buy Box */}
          <div
            style={{
              backgroundColor: '#161616',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '1.5rem',
              color: '#e0e0e0',
              flex: '1 1 300px',
              minWidth: '280px',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>
              ♣️ Buy Tokens with Solana ♣️
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#aaa', marginTop: '0.5rem' }}>
              Swap SOL for gameplay tokens. 1 SOL = 1000 tokens. Tokens go straight into your PokerBot Wallet Balance.
            </p>
            <p style={{ fontSize: '1rem', color: '#b480ff', marginTop: '1rem' }}>
              Your available SOL balance: <strong>2.9305</strong>
            </p>
            <label style={{ display: 'block', marginTop: '1rem', marginBottom: '0.5rem' }}>
              How many SOL to deposit?
            </label>
            <input
              type="number"
              value="0.1"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #444',
                backgroundColor: '#1e1e1e',
                color: '#fff',
                marginBottom: '1rem',
              }}
            />
            <button
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                backgroundColor: '#2ecc71',
                color: '#000',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ♣️ Swap SOL → Tokens
            </button>
          </div>
    
          {/* Sell Box */}
          <div
            style={{
              backgroundColor: '#161616',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '1.5rem',
              color: '#e0e0e0',
              flex: '1 1 300px',
              minWidth: '280px',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>
              ♦️ Sell Tokens into Solana ♦️
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#aaa', marginTop: '0.5rem' }}>
              Swap your gameplay tokens back into SOL. 1000 tokens = 1 SOL (fee 1%). Sign with the same wallet saved in the poker bot.
            </p>
            <p style={{ fontSize: '1rem', color: '#b480ff', marginTop: '1rem' }}>
              Your available token balance: <strong>129310</strong>
            </p>
            <label style={{ display: 'block', marginTop: '1rem', marginBottom: '0.5rem' }}>
              How many tokens to withdraw?
            </label>
            <input
              type="number"
              value="100"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #444',
                backgroundColor: '#1e1e1e',
                color: '#fff',
                marginBottom: '1rem',
              }}
            />
            <button
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                backgroundColor: '#e74c3c',
                color: '#fff',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ♦️ Swap Tokens → SOL
            </button>
          </div>
        </div>
    
        {/* 📜 Recent Transactions Table */}
        <div
          style={{
            width: '100%',
            overflowX: 'hidden',
            padding: '1.5rem',
            backgroundColor: '#161616',
            border: '1px solid #333',
            borderRadius: '12px',
            boxSizing: 'border-box',
          }}
        >
          <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1.2rem' }}>
            📜 Recent Transactions
          </h3>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: window.innerWidth < 600 ? '0.8rem' : '0.9rem',
              tableLayout: 'fixed',
              backgroundColor: '#161616',
              color: '#eee',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #444' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#bbb' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#bbb' }}>Amount</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#bbb' }}>Timestamp</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#bbb' }}>Tx ID</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#bbb' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '1rem', color: '#888', textAlign: 'center' }}>
                    No transactions yet.
                  </td>
                </tr>
              )}
              {transactions.map((tx, i) => (
                <React.Fragment key={i}>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '0.75rem' }}>
                      {tx.type === 'voucher'
                        ? 'Withdraw'
                        : tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{tx.amount}</td>
                    <td
                      style={{
                        padding: '0.75rem',
                        maxWidth: '130px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        maxWidth: '100px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {(tx.txid || tx.signature) ? (
                        <a
                          href={`https://explorer.solana.com/tx/${tx.txid ?? tx.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-block', color: '#66b2ff' }}
                        >
                          {(tx.txid ?? tx.signature).slice(0, 10)}…
                        </a>
                      ) : (
                        <span style={{ color: '#666' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: window.innerWidth < 600 ? 'column' : 'row',
                          alignItems: 'flex-start',
                          gap: '0.25rem',
                        }}
                      >
                        {tx.status === 'pending' ? (
                          window.innerWidth < 600 ? (
                            <span style={{ fontSize: '1.2rem', color: '#f39c12' }}>❗️</span>
                          ) : (
                            <button
                              onClick={() => handleClaim(tx)}
                              style={{
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.85rem',
                                borderRadius: '6px',
                                border: '1px solid #666',
                                backgroundColor: '#1e1e1e',
                                color: '#eee',
                                cursor: 'pointer',
                              }}
                            >
                              CLAIM VOUCHER
                            </button>
                          )
                        ) : (
                          <span
                            style={{
                              color: '#2ecc71',
                              fontSize: window.innerWidth < 600 ? '1.2rem' : '0.85rem',
                              fontWeight: 600,
                            }}
                          >
                            {window.innerWidth < 600 ? '✅' : 'COMPLETED'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
    
                  {/* Mobile full-width CLAIM button */}
                  {tx.status === 'pending' && window.innerWidth < 600 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '0.75rem 0.75rem 1rem' }}>
                        <button
                          onClick={() => handleClaim(tx)}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            borderRadius: '8px',
                            border: '1px solid #666',
                            backgroundColor: '#1e1e1e',
                            color: '#eee',
                            cursor: 'pointer',
                          }}
                        >
                          CLAIM VOUCHER
                        </button>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
// ─────────────────────────────────────────────
// Combined display + withdraw logic component
function BalanceDisplay({ username, onNewTx }) {
  console.log("🌱 VITE_VAULT_PROGRAM_ID:", import.meta.env.VITE_VAULT_PROGRAM_ID)
console.log("🌱 VITE_BOT_PUBKEY:      ", import.meta.env.VITE_BOT_PUBKEY)
console.log("🌱 VITE_TREASURY_PUBKEY: ", import.meta.env.VITE_TREASURY_PUBKEY)
  const { publicKey, connected, sendTransaction, signAllTransactions } = useWallet();
  const [solBalance, setSolBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [depositAmountSol, setDepositAmountSol] = useState("0.1");
  const [isDepositing,   setIsDepositing]   = useState(false);
  const [isWithdrawing,  setIsWithdrawing]  = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("100");
  const [depositConfirmed, setDepositConfirmed] = useState(false);

  const refreshBalances = () => {
        if (connected && publicKey) {
          fetch(`https://texas-poker-production.up.railway.app/api/sol-balance?pubkey=${publicKey.toBase58()}`)
            .then(res => res.json())
            .then(data => setSolBalance(data.sol))
            .catch(err => console.error('🛠 sol-balance error', err));
        }
        if (username) {
          fetch(`https://texas-poker-production.up.railway.app/api/telegram-balance?username=${username}`)
            .then(res => res.json())
            .then(data => setTokenBalance(data.tokens))
            .catch(err => console.error('🛠 token-balance error', err));
        }
      };

      useEffect(() => {
        setTimeout(() => {
          refreshBalances();
        }, 1500);
          }, [connected, publicKey, username]);

// ─── Deposit Handler ─────────────────────────────────
const handleDeposit = async () => {
  if (!publicKey || !username) {
    toast.error("❌ Wallet or username not connected");
    return;
  }

  const depositAmount = Math.round(parseFloat(depositAmountSol) * 1e9);
  if (isNaN(depositAmount) || depositAmount <= 0) {
    toast.error("❌ Please enter a valid deposit amount.");
    return;
  }
  if (solBalance != null && parseFloat(depositAmountSol) > solBalance) {
    toast.error("❌ You cannot deposit more SOL than your wallet balance.");
    return;
  }

  setIsDepositing(true);

  try {
    const programId = new PublicKey(import.meta.env.VITE_VAULT_PROGRAM_ID);
    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_v2")],    // matches GAME_VAULT_SEED = b"vault"
      programId
    );
    console.log("🔐 Vault PDA computed:", vaultPDA.toBase58());

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
      toast.error("❌ Simulation failed: " + JSON.stringify(sim.value.err));
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
        refreshBalances();
      }, 1500);
      toast.success("✅ Deposit confirmed!", { autoClose: 4000 });
    // signal the UI to re-fetch the tx list
       onNewTx();
     } else {
       console.warn("⚠️ DepositEvent missing in logs");
       toast.error("⚠️ Deposit failed on-chain: no confirmation event");
    }

  } catch (err) {
    console.error("❌ Deposit failed", err);
    toast.error("❌ Deposit failed. See console for details.");
  } finally {
    setIsDepositing(false);
  }
};
// ─────────────────────────────────────────────────────

  // Handle Withdraw
const handleWithdraw = async () => {
  if (!publicKey || !username || tokenBalance == null) {
    alert("Please connect your wallet and wait for balances to load.");
    return;
  }

  // 1️⃣ Validate input
  const amount = parseInt(withdrawAmount, 10);
  if (isNaN(amount) || amount < 100) {
    toast.error("❌ Minimum withdraw = 100 tokens.");
    return;
  }
  if (amount > tokenBalance) {
    toast.error("❌ Cannot withdraw more than your total tokens.");
    return;
  }

  setIsWithdrawing(true);

  try {
    // 2️⃣ Get voucher from backend (use ms-granularity so you never collide)
    const nonce = Date.now();
    const res = await fetch(
      "https://texas-poker-production.up.railway.app/api/request-voucher",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          username,
          amount,
          nonce
        })
      }
    );
    const { success, voucher, error } = await res.json();
    if (!success) {
      toast.error("❌ Voucher rejected: " + error);
      return;
    }
    console.log("✅ Voucher received:", voucher);

    // 3️⃣ Build the two on-chain instructions
    const programId      = new PublicKey(import.meta.env.VITE_VAULT_PROGRAM_ID);
    const [vaultPDA]     = PublicKey.findProgramAddressSync([Buffer.from("vault_v2")], programId);
    const treasuryPubkey = new PublicKey(import.meta.env.VITE_TREASURY_PUBKEY);
    const [userVaultAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), publicKey.toBuffer()],
      programId
    );

    // — decode and pack
    const sigBytes = bs58.decode(voucher.signature);
    const msgBuf   = Buffer.concat([
      publicKey.toBuffer(),
      Buffer.from(new BN(voucher.amount).toArray("le", 8)),
      Buffer.from(new BN(voucher.nonce).toArray("le", 8)),
      Buffer.from(new BN(parseInt(username, 10)).toArray("le", 8)),
    ]);

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
      [
        WithdrawPayload,
        {
          kind: "struct",
          fields: [
            ["variant",     "u8"],
            ["amount",      "u64"],
            ["nonce",       "u64"],
            ["telegram_id", "u64"],
            ["signature",   [64]],
          ],
        },
      ],
    ]);
    const withdrawData = Buffer.from(
      borsh.serialize(
        WithdrawSchema,
        new WithdrawPayload({
          variant:     2,
          amount:      BigInt(voucher.amount),
          nonce:       BigInt(voucher.nonce),
          telegram_id: BigInt(parseInt(username, 10)),
          signature:   sigBytes,
        })
      )
    );

    // 3️⃣a) ed25519 verify ix must come first
     const verifyIx = Ed25519Program.createInstructionWithPublicKey({
         publicKey:   bs58.decode(import.meta.env.VITE_BOT_PUBKEY),
         message:     msgBuf,
         signature:   sigBytes,
       });
   
    const withdrawIx = new TransactionInstruction({
             programId,
             keys: [
               { pubkey: publicKey,               isSigner: true,  isWritable: true  },
               { pubkey: vaultPDA,                isSigner: false, isWritable: true  },
               { pubkey: treasuryPubkey,          isSigner: false, isWritable: true  },
               { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
               { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
               { pubkey: userVaultAccount,        isSigner: false, isWritable: true  },
             ],
             data: withdrawData,
           });

    // 4️⃣ Assemble & simulate (optional)
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const tx = new Transaction()
          .add(verifyIx)      // <– must come first
          .add(withdrawIx);   // <– then your PDA CPI
    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;

    console.log("🚧 Running preflight simulation…");
    const sim = await connection.simulateTransaction(tx);
    console.log("💡 Simulation logs:", sim.value.logs);
    if (sim.value.err) {
      console.error("❌ Preflight error:", sim.value.err);
      toast.error("❌ Withdraw simulation failed:\n" + JSON.stringify(sim.value.err));
      return;
    }

    // 5️⃣ Sign & submit
     console.log("🚧 Signing & sending transaction…");
     const [signedTx] = await signAllTransactions([tx]);
     const raw = signedTx.serialize();
     const signature = await connection.sendRawTransaction(raw);
     console.log("📨 Withdraw tx signature:", signature);
     await connection.confirmTransaction(
       { signature, blockhash, lastValidBlockHeight },
       "confirmed"
     );

    // 6️⃣ Fetch on-chain logs for WithdrawEvent:
    const confirmed = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    const logs = confirmed?.meta?.logMessages || [];
    console.log("🪵 On-chain logs:", logs);

   // 7️⃣ Find and alert
const evt = logs.find((l) => l.includes("WithdrawEvent:"));
if (evt) {
  console.log("✅ WithdrawEvent found:", evt);

  // refresh on-chain balances shortly after
  setTimeout(() => {
    refreshBalances();
  }, 1500);

  // notify user
  toast.success("✅ Withdraw confirmed!", { autoClose: 4000 });

  // signal the UI to re-fetch the transaction list
  onNewTx();
} else {
  console.warn("⚠️ WithdrawEvent missing in logs");
  alert(
    "Withdraw likely succeeded but no on-chain event found—" +
    "check Explorer:\n" +
    `https://explorer.solana.com/tx/${signature}?cluster=devnet`
  );
}

  } catch (err) {
         console.error("Withdraw failed:", err);
         if (
           err instanceof SendTransactionError ||
           err.message?.includes("already been processed")
         ) {
          toast.info("ℹ️ Withdrawal likely already processed. Check your wallet.");
         } else {
          toast.error("❌ Withdraw failed: " + (err.message || err));
         }
         onNewTx();
  } finally {
    setIsWithdrawing(false);
  }
};

return (
  <div
    style={{
      width: '100%',
      boxSizing: 'border-box',
      padding: '0 0.25rem',      // horizontal gutter on mobile
      marginTop: '0.25rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: window.innerWidth >= 768 ? '2rem' : '0.5rem',
    }}
  >
    {/* Left: Deposit Section */}
    <div
    style={{
      flex: '1 1 400px',
      maxWidth: '400px',
      textAlign: 'left',
      backgroundColor: '#1e1e1e',    // dark card
      border: '1px solid #444',      // softer border
      borderRadius: '8px',
      padding: '1rem',
      boxSizing: 'border-box',
      color: '#ddd',                 // light text by default
    }}
    >
      <h3 style={{ marginBottom: '0.5rem' }}>♣️ Buy Tokens with Solana ♣️</h3>
      <p style={{ margin: 0, marginBottom: '1rem', color: '#555' }}>
        Swap SOL for gameplay tokens. 1 SOL = 1000 tokens. Tokens go straight into your PokerBot Wallet Balance.
      </p>

      <p id="sol-balance">
        Your available SOL balance:{' '}
        <strong>{solBalance != null ? solBalance.toFixed(4) : '…'}</strong>
      </p>

      <div style={{ marginTop: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem' }}>
          How many SOL to deposit?
        </label>
        <input
          type="number"
          value={depositAmountSol}
          min="0"
          step="0.01"
          max={solBalance ?? undefined}
          onChange={e => setDepositAmountSol(e.target.value)}
          style={{
            display: 'block',
            width: '6rem',
            padding: '0.25rem',
            fontSize: '1rem',
            marginBottom: '0.5rem',
            backgroundColor: '#333',      // dark background
            color: '#eee',                // light text
            border: '1px solid #555',     // subtle border
            borderRadius: '4px',
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleDeposit}
        disabled={isDepositing}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          fontWeight: '600',
          background: '#0A6430',                // poker‐table green
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '6px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          cursor: isDepositing ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s ease',
        }}
      >
        {isDepositing ? '♣️ Depositing…' : '♣️ Swap SOL → Tokens'}
      </button>
    </div>

    {/* Right: Withdraw Section */}
    <div
    style={{
      flex: '1 1 400px',
      maxWidth: '400px',
      textAlign: 'left',
      backgroundColor: '#1e1e1e',    // dark card
      border: '1px solid #444',      // softer border
      borderRadius: '8px',
      padding: '1rem',
      boxSizing: 'border-box',
      color: '#ddd',                 // light text by default
    }}
    >
      <h3 style={{ marginBottom: '0.5rem' }}>♦️ Sell Tokens into Solana ♦️</h3>
      <p style={{ margin: 0, marginBottom: '1rem', color: '#555' }}>
        Swap gameplay tokens back into SOL. 1000 tokens = 1 SOL (fee 1%). Sign with the same wallet saved in the poker bot.
      </p>

      <p id="token-balance">
        Your available token balance:{' '}
        <strong>{tokenBalance != null ? tokenBalance : '…'}</strong>
      </p>

      <div style={{ marginTop: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem' }}>
          How many tokens to withdraw?
        </label>
        <input
          type="number"
          value={withdrawAmount}
          min="99"
          step="1"
          max={tokenBalance ?? undefined}
          onChange={e => setWithdrawAmount(e.target.value)}
          style={{
            display: 'block',
            width: '6rem',
            padding: '0.25rem',
            fontSize: '1rem',
            marginBottom: '0.5rem',
            backgroundColor: '#333',      // dark background
            color: '#eee',                // light text
            border: '1px solid #555',     // subtle border
            borderRadius: '4px',
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleWithdraw}
        disabled={isWithdrawing || tokenBalance === 0}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          fontWeight: '600',
          background: '#8B0000',                // deep red
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '6px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          cursor: isWithdrawing || tokenBalance === 0 ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s ease',
        }}
      >
        {isWithdrawing ? '♦️ Withdrawing…' : '♦️ Swap Tokens → SOL'}
      </button>
    </div>
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

  const [refreshCounter, setRefreshCounter] = useState(0);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletMultiButton />
          
          {/* Toast notification container */}
          <ToastContainer
            position="top-center"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"  
          />
  
          {/* pass down a signal so BalanceDisplay can trigger a list-refresh */}
          {/* tell BalanceDisplay to bump our counter on a new on-chain tx */}
          <BalanceDisplay
            username={username}
            onNewTx={() => setRefreshCounter(c => c + 1)}
          />
          
          {/* re-fetch whenever refreshCounter changes */}
          <TransactionTable
            username={username}
            refreshSignal={refreshCounter}
          />
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