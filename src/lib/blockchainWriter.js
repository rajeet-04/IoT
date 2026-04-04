/**
 * Blockchain Writer Service
 * Sends IoT device actions to the Sepolia blockchain
 */

import { ethers } from 'ethers';

// Contract ABI (full - for writing)
const CONTRACT_ABI = [
  'function logAction(bytes32 deviceId, string calldata action, bytes32 dbRecordId) external',
  'event DeviceAction(bytes32 indexed deviceId, string action, uint256 timestamp, address indexed user, bytes32 indexed dbRecordId)'
];

let provider = null;
let contract = null;
let signer = null;
let signerAddress = null;
let isInitialized = false;

/**
 * Initialize blockchain writer
 * @param {string} rpcUrl - Infura Sepolia RPC URL
 * @param {string} contractAddress - Deployed IOTEventLog address
 * @param {string} privateKey - Server wallet private key (funded account)
 */
export function initBlockchainWriter(rpcUrl, contractAddress, privateKey) {
  if (!rpcUrl || !contractAddress) {
    console.warn('[BLOCKCHAIN WRITER] RPC URL or contract address not configured - running without blockchain writes');
    isInitialized = false;
    return;
  }

  if (!privateKey) {
    console.warn('[BLOCKCHAIN WRITER] PRIVATE_KEY not configured - blockchain writes disabled');
    isInitialized = false;
    return;
  }

  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    signer = new ethers.Wallet(privateKey, provider);
    contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
    isInitialized = true;
    console.log(`[BLOCKCHAIN WRITER] Initialized with signer: ${signer.address}`);
    
    // DEBUG: Verify we can connect to the network
    provider.getBlockNumber().then(blockNum => {
      console.log(`[BLOCKCHAIN WRITER] Connected to network at block: ${blockNum}`);
    }).catch(err => {
      console.error(`[BLOCKCHAIN WRITER] Network connection failed:`, err.message);
    });
  } catch (error) {
    console.error('[BLOCKCHAIN WRITER] Failed to initialize:', error.message);
    isInitialized = false;
  }
}

/**
 * Check if writer is initialized
 */
export function isWriterInitialized() {
  return isInitialized;
}

/**
 * Send a device action to the blockchain
 * @param {Object} params
 * @param {string} params.deviceId - Device identifier
 * @param {string} params.action - 'turn_on' or 'turn_off'
 * @param {string} params.txId - MongoDB transaction ID
 * @param {string} params.walletAddress - User's wallet address
 * @returns {Promise<{txHash: string, success: boolean}>}
 */
export async function sendToBlockchain({ deviceId, action, txId, walletAddress }) {
  // DEBUG logging
  console.log('[BLOCKCHAIN WRITER] sendToBlockchain called:', { deviceId, action, txId, walletAddress, isInitialized });
  
  if (!isInitialized) {
    console.warn('[BLOCKCHAIN WRITER] Not initialized - skipping blockchain write');
    return { txHash: null, success: false };
  }

  if (!walletAddress || walletAddress === 'unconnected') {
    console.log('[BLOCKCHAIN WRITER] No wallet connected - skipping blockchain write');
    return { txHash: null, success: false };
  }

  try {
    // Convert action to blockchain format ("on" or "off")
    const blockchainAction = action === 'turn_on' ? 'on' : 'off';

    // NOTE: UUID deviceIds (36 chars) exceed encodeBytes32String's 32-byte limit.
    // Use keccak256 hash for a stable 32-byte representation of any-length string.
    const deviceIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(deviceId));

    // Convert MongoDB _id to bytes32 (keccak256 of the ID string)
    const dbRecordIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(txId));

    console.log(`[BLOCKCHAIN WRITER] Sending to blockchain: deviceId=${deviceId}, deviceIdBytes32=${deviceIdBytes32}, action=${blockchainAction}, txId=${txId}, dbRecordIdBytes32=${dbRecordIdBytes32}, walletAddress=${walletAddress}`);

    // DEBUG: Check signer balance before sending
    const balance = await provider.getBalance(signer.address);
    console.log(`[BLOCKCHAIN WRITER] Signer balance: ${ethers.formatEther(balance)} ETH`);

    // Send transaction to contract
    const tx = await contract.logAction(
      deviceIdBytes32,
      blockchainAction,
      dbRecordIdBytes32
    );

    console.log(`[BLOCKCHAIN WRITER] Transaction sent: ${tx.hash}`);

    // Wait for confirmation (optional - could also let listener handle it)
    const receipt = await tx.wait();

    console.log(`[BLOCKCHAIN WRITER] Transaction confirmed in block: ${receipt.blockNumber}`);

    return { txHash: tx.hash, success: true };
  } catch (error) {
    console.error('[BLOCKCHAIN WRITER] Error sending to blockchain:', error.message);
    return { txHash: null, success: false };
  }
}

/**
 * Get the signer address
 */
export function getSignerAddress() {
  return signerAddress;
}

export default {
  initBlockchainWriter,
  isWriterInitialized,
  sendToBlockchain,
  getSignerAddress,
};
