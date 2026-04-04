# Phase 4 Research: Crypto Wallet Transaction System

**Phase:** 04-transaction-audit-system
**Researched:** 2026-04-04
**Status:** Complete

---

## Executive Summary

Phase 4 will use **actual blockchain transactions** instead of MongoDB-stored hash chains. Users connect their MetaMask wallet, and each relay ON/OFF action creates a real transaction on the Sepolia testnet (free).

### Key Changes from Original Plan

| Original | New Approach |
|----------|--------------|
| MongoDB hash-chain transactions | Actual blockchain transactions via MetaMask |
| Custom SHA-256 hash chaining | On-chain transaction hash from Ethereum |
| Backend computes and stores hashes | Blockchain provides immutable audit trail |
| MongoDB query for history | Query blockchain via wallet address |

---

## 1. Wallet Integration Stack

### Primary: MetaMask Connect EVM

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@metamask/connect-evm** | 2.x | Wallet connection | Official MetaMask SDK, supports browser extension + mobile, handles cross-platform | HIGH |
| **viem** | 2.x | Ethereum RPC client | Lightweight, TypeScript-first, works with MetaMask provider | HIGH |
| **wagmi** | 2.x | React hooks | Simplifies wallet state management, integrates with viem | HIGH |

### Alternative: WalletConnect

| Technology | Purpose | Why |
|------------|---------|-----|
| **@walletconnect/modal** | Multi-wallet support | Connect to 300+ wallets, not just MetaMask |
| **web3modal** | Universal wallet UI | Single integration for many wallets |

**Decision:** Use MetaMask Connect EVM first. It's the most popular, simplest to integrate, and sufficient for v1. WalletConnect can be added in v2 if multi-wallet support is needed.

---

## 2. Blockchain Network Selection

### Options

| Network | Type | Transaction Cost | Setup Required | Notes |
|---------|------|------------------|----------------|-------|
| **Sepolia** | Ethereum testnet | Free (faucet ETH) | Yes - add to MetaMask | Most realistic testnet, simulates mainnet |
| **Linea** | L2 rollup | Very cheap (<$0.01) | Yes - add RPC | Faster, cheaper than Sepolia |
| **Polygon zkEVM** | L2 rollup | Very cheap (<$0.01) | Yes - add RPC | Good ecosystem |
| **Ethereum mainnet** | L1 | Real ETH (~$1-5 gas) | No | Too expensive for IoT use case |

### Decision: **Sepolia Testnet**

**Rationale:**
- **Free transactions** via faucet
- **Realistic simulation** of mainnet behavior
- **Widely supported** by all tools and infrastructure
- **No real money** - safe for testing
- **Users can see** their transactions on Etherscan

### Sepolia Configuration

```javascript
// Network configuration
const SEPOLIA_CONFIG = {
  chainId: '0xaa36a7',        // 11155111 in hex
  chainName: 'Sepolia',
  nativeCurrency: {
    name: 'SepoliaETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://sepolia.infura.io/v3/YOUR_INFURA_KEY'],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
}
```

---

## 3. Smart Contract Design

### Option A: Custom IoT Relay Contract (Recommended)

Deploy a minimal smart contract to store relay state on-chain.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IOTRelayControl {
    struct RelayState {
        bool isOn;
        uint256 timestamp;
        address controller;
    }
    
    mapping(bytes32 => RelayState) public relays;
    
    event RelayToggled(
        bytes32 indexed deviceId,
        bool newState,
        uint256 timestamp,
        address indexed controller
    );
    
    function toggleRelay(bytes32 deviceId, bool newState) external {
        relays[deviceId] = RelayState({
            isOn: newState,
            timestamp: block.timestamp,
            controller: msg.sender
        });
        
        emit RelayToggled(deviceId, newState, block.timestamp, msg.sender);
    }
    
    function getRelayState(bytes32 deviceId) external view returns (bool, uint256, address) {
        RelayState memory state = relays[deviceId];
        return (state.isOn, state.timestamp, state.controller);
    }
}
```

### Option B: Event Logging Only (Simpler)

Don't store state on-chain, just emit events. State remains in MongoDB.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IOTEventLog {
    event DeviceAction(
        bytes32 indexed deviceId,
        string action,  // "on" or "off"
        uint256 timestamp,
        address indexed user,
        bytes32 indexed txHash  // Links to MongoDB record
    );
    
    function logAction(
        bytes32 deviceId,
        string memory action,
        bytes32 txHash
    ) external {
        emit DeviceAction(deviceId, action, block.timestamp, msg.sender, txHash);
    }
}
```

### Decision: **Option B - Event Logging Only**

**Rationale:**
- Simpler contract (less deployment cost, less attack surface)
- State still managed by MongoDB (for quick queries)
- Blockchain provides **immutable proof** that actions occurred
- Can upgrade to Option A in v2 if on-chain state is needed
- Transaction cost is minimal for event-only transactions

---

## 4. Transaction Flow

```
User clicks "ON" in dashboard
    │
    ▼
Frontend sends WebSocket command to backend
    │ { "deviceId": "esp32-001", "action": "on" }
    ▼
Backend validates, sends command to ESP32
    │
    ▼
ESP32 actuates relay, sends ACK
    │
    ▼
Backend creates MongoDB record (device, user, action, timestamp)
    │
    ▼
Backend constructs blockchain transaction:
    │ contract.logAction(deviceId, "on", dbRecord._id)
    ▼
Frontend shows "Confirming..." (transaction pending)
    │
    ▼
User's MetaMask prompts for transaction signature
    │
    ▼
Transaction submitted to Sepolia
    │
    ▼
Transaction confirmed on-chain (1-2 blocks)
    │
    ▼
Backend receives confirmation, updates MongoDB with txHash
    │
    ▼
Frontend shows "Confirmed ✓" with Etherscan link
    │
    ▼
User can view transaction on Etherscan: etherscan.io/tx/{txHash}
```

---

## 5. Frontend Integration

### Wallet Connection Flow

```typescript
// 1. Install @metamask/connect-evm
// npm install @metamask/connect-evm viem

// 2. Create wallet client
import { createEVMClient } from '@metamask/connect-evm';

const evmClient = await createEVMClient({
  dapp: {
    name: 'IoT Device Control',
    url: window.location.origin,
    iconUrl: '/icon.png'
  },
  api: {
    supportedNetworks: {
      '0xaa36a7': 'https://sepolia.infura.io/v3/YOUR_KEY'
    }
  }
});

// 3. Connect wallet
const { accounts, chainId } = await evmClient.connect({
  chainIds: ['0xaa36a7']  // Sepolia
});

// 4. Get provider for transactions
const provider = evmClient.getProvider();
```

### Sending Transaction

```typescript
async function toggleRelay(deviceId: string, action: 'on' | 'off') {
  // Get contract instance
  const contractAddress = '0x...'; // Deployed IOTEventLog address
  
  // Construct transaction data
  const deviceIdBytes = ethers.utils.formatBytes32String(deviceId);
  const txHash = await storePendingActionInMongoDB(deviceId, action);
  
  // Send transaction via MetaMask
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: accounts[0],
      to: contractAddress,
      data: encodeFunctionData('logAction', [deviceIdBytes, action, txHash])
    }]
  });
  
  return txHash; // User signs in MetaMask
}
```

---

## 6. Backend Changes

### New Dependencies

```json
{
  "@metamask/connect-evm": "^2.0.0",
  "viem": "^2.0.0"
}
```

### New MongoDB Collections

```javascript
// transactions collection - minimal metadata
{
  _id: ObjectId,
  deviceId: String,
  userId: ObjectId,
  walletAddress: String,        // User's connected wallet
  action: String,               // "on" | "off"
  timestamp: Date,
  txHash: String,              // Blockchain transaction hash
  blockNumber: Number,          // On-chain block number
  status: String,               // "pending" | "confirmed" | "failed"
  contractAddress: String       // Deployed contract
}
```

### Backend Responsibilities

1. **Store pending action** in MongoDB before blockchain tx
2. **Return txHash** to frontend for MetaMask signing
3. **Listen for confirmation** via blockchain events or polling
4. **Update status** in MongoDB when confirmed
5. **Provide API** for querying user's transaction history

---

## 7. Transaction History UI

### Source of Truth

- **On-chain:** Transaction hash, block number, timestamp from Ethereum
- **In MongoDB:** Device info, user info, action type, link between actions

### UI Components

| Component | Data Source | Display |
|-----------|-------------|---------|
| Transaction list | MongoDB + Etherscan API | Paginated table with tx hashes |
| Transaction detail | Etherscan API | Full tx data with status |
| Duration metrics | MongoDB aggregation | Calculated from on-chain timestamps |
| Integrity badge | Always "On-Chain ✓" | No verification needed |

### Etherscan Integration

```typescript
// Fetch transaction details from Etherscan
async function getTxDetails(txHash: string) {
  const response = await fetch(
    `https://api-sepolia.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=YOUR_KEY`
  );
  return response.json();
}
```

---

## 8. Cost Analysis

### Per-Transaction Cost (Sepolia)

| Operation | Cost |
|-----------|------|
| Gas for event-only contract | ~21,000 gas (base) |
| Gas price (Sepolia) | ~15 gwei |
| **Total cost** | **~0.0003 ETH** (~$0.001) |

### User Cost per Relay Toggle

- **Sepolia testnet:** Free (user gets ETH from faucet)
- **Linea/Polygon:** ~$0.001-0.01
- **Ethereum mainnet:** ~$1-5 (NOT recommended for IoT)

### Infrastructure Cost (v1)

| Service | Cost | Notes |
|---------|------|-------|
| Infura API | Free tier (100k calls/day) | Sufficient for v1 |
| Etherscan API | Free tier (3 calls/sec) | For tx history lookup |
| Contract deployment | Free on testnet | One-time |
| Smart contract | Free on testnet | No hosting cost |

---

## 9. Security Considerations

### Wallet Security

- **Never store private keys** - all signing happens in user's MetaMask
- **Validate wallet address** matches logged-in user in MongoDB
- **Rate limit** transaction submissions per user

### Smart Contract Security

- Event-only contract has minimal attack surface
- No funds stored in contract
- Only whitelisted addresses can call (optional v2 enhancement)

### Frontend Security

- Validate chain ID matches expected (Sepolia) before transactions
- Display clear warnings if connected to wrong network
- Never cache or log transaction contents

---

## 10. Migration Path

### v1 (Current)
- MongoDB hash-chain transactions (existing plan)
- Backend computes and stores hashes
- Hash chain verification via custom logic

### v2 (This Phase)
- MetaMask wallet connection
- Actual blockchain transactions on Sepolia
- MongoDB stores minimal metadata + tx hashes
- Etherscan for transaction history

### v3 (Future)
- Custom smart contract for on-chain state
- L2 optimization (Linea/Polygon) for lower cost
- Multi-chain support via WalletConnect

---

## 11. Implementation Plan

### Plan 04-01: Wallet Integration & Contract Deployment
1. Install @metamask/connect-evm SDK
2. Create wallet connection UI component
3. Deploy IOTEventLog contract to Sepolia
4. Test wallet connection flow

### Plan 04-02: Backend Transaction Recording
1. Update MongoDB schema for blockchain tx
2. Create transaction recording service
3. Integrate with WebSocket command flow
4. Add Etherscan API integration

### Plan 04-03: Transaction History UI
1. Update dashboard with wallet connect button
2. Create transaction history table
3. Add duration metrics display
4. Link to Etherscan for transaction details

---

## Sources

- **MetaMask Connect EVM**: https://docs.metamask.io/metamask-connect/evm/
- **Sepolia Testnet**: https://www.sepoliascan.org/
- **Etherscan API**: https://docs.etherscan.io/
- **Infura**: https://www.infura.io/
- **Solidity Documentation**: https://docs.soliditylang.org/

---

*Research complete. Ready for planning.*
