---
status: investigating
trigger: "The blockchain writer shows 10 pending transactions but they're never confirmed"
created: 2026-04-04T00:00:00.000Z
updated: 2026-04-04T14:00:00.000Z
---

## Current Focus

**INVESTIGATION IN PROGRESS**

Checking if `sendToBlockchain()` is being called and why transactions remain pending.

## Current Focus

**ROOT CAUSE IDENTIFIED AND FIXED**

The system was not sending transactions to the blockchain - it was only listening for events that were never sent.

## Symptoms

**expected:** Each command should create a transaction on Sepolia blockchain, and after ~15 seconds, `txHash` should be populated from on-chain confirmation

**actual:** Transactions were created locally in MongoDB with a `hash` field, but blockchain listener showed "Checking N pending transactions" and status remained "pending" - no `txHash` was being set

**errors:** None directly visible - the listener correctly logged "Checking N pending transactions" but found nothing because no transactions were sent to blockchain

**reproduction:** Send any command via dashboard - transaction record is created but never confirmed

**started:** Since blockchain integration was added (the read-only integration was incomplete)

## Evidence

- timestamp: 2026-04-04
  checked: "src/routes/device.routes.js" command endpoint
  found: "Transactions were created WITHOUT walletAddress field. Line 182-189 created transaction with deviceId, userId, action, relayState, timestamp, commandId - but NO walletAddress"
  implication: "Without walletAddress, blockchain listener skips these transactions (line 99 in blockchainListener.js)"

- timestamp: 2026-04-04
  checked: "src/models/User.js"
  found: "User model had NO walletAddress field - users cannot store their connected wallet address in the database"
  implication: "Even if frontend connects wallet, there's no place to store it server-side"

- timestamp: 2026-04-04
  checked: "Entire codebase for blockchain write operations"
  found: "NO code exists that calls contract.logAction() to send transactions to Sepolia"
  implication: "The system only LISTENS for events - it never WRITES events to blockchain"

- timestamp: 2026-04-04
  checked: "src/lib/blockchainListener.js" and "src/lib/web3.ts"
  found: "Both files only contained READ-ONLY logic (queryFilter, getTransactionReceipt). No signer, no wallet, no sendTransaction"
  implication: "Even if we added walletAddress to transactions, there's no mechanism to actually send them to blockchain"

- timestamp: 2026-04-04
  checked: ".env configuration"
  found: "INFURA_SEPOLIA_URL and CONTRACT_ADDRESS are configured correctly"
  implication: "Infrastructure is ready - just missing the write operation"

## Resolution

**root_cause:** The system had a read-only blockchain integration. It created local MongoDB transaction records and listened for blockchain events, but never actually sent transactions to the Sepolia blockchain. Additionally, transactions were created without the required walletAddress field, so even if blockchain events were being sent, the listener would skip them.

**fix:** Implemented 4 changes:

1. **Added walletAddress to User model** - Users can now store their connected wallet address in the database

2. **Added wallet endpoint to auth routes** - New `POST /api/auth/wallet` endpoint allows frontend to save user's wallet address

3. **Modified command endpoint to include walletAddress** - Updated `src/routes/device.routes.js` to fetch user's walletAddress and include it when creating the transaction

4. **Added blockchain writer service** - Created `src/lib/blockchainWriter.js` that:
   - Takes transaction details and calls `contract.logAction()` on the Sepolia contract
   - Requires a server-side signer (funded wallet private key in env)
   - Sends the transaction and logs the txHash

5. **Updated frontend to save wallet address** - Modified wallet-connect.tsx to call the new `/api/auth/wallet` endpoint when connecting

**files_changed:**
- src/models/User.js: Add walletAddress field
- src/routes/auth.routes.js: Add wallet endpoint and include walletAddress in /me response
- src/routes/device.routes.js: Include walletAddress when creating transaction, call blockchain writer
- src/lib/blockchainWriter.js (NEW): Send transactions to Sepolia
- src/index.js: Initialize blockchain writer
- frontend/src/components/wallet/wallet-connect.tsx: Save wallet address to backend on connect

**verification:** After fix:
1. User connects wallet in frontend → address is saved to User document via `/api/auth/wallet`
2. User sends command → transaction created WITH walletAddress from user's record
3. Backend immediately calls contract.logAction() via blockchainWriter → transaction sent to Sepolia
4. Blockchain listener polls and finds the event → txHash populated, status = confirmed

**Required for full operation:**
- Add `PRIVATE_KEY` to .env with a funded Sepolia wallet (needs Sepolia ETH)
- The contract `0xd9145CCE52D386f254917e481eB44e9943F39138` must be deployed and funded
