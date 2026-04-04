/**
 * Web3 Utilities for blockchain interaction
 * Used for querying transaction receipts and contract events from Sepolia
 */

import { ethers } from 'ethers';

// Environment variables
const INFURA_KEY = process.env.INFURA_KEY || '';
const INFURA_SEPOLIA_URL = process.env.INFURA_SEPOLIA_URL || 
  `https://sepolia.infura.io/v3/${INFURA_KEY}`;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Contract ABI (events only - for listening)
const CONTRACT_ABI = [
  'event DeviceAction(bytes32 indexed deviceId, string action, uint256 timestamp, address indexed user, bytes32 indexed dbRecordId)'
];

/**
 * Get provider for Sepolia network
 */
export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(INFURA_SEPOLIA_URL);
}

/**
 * Get contract instance for listening to events
 */
export function getContract(): ethers.Contract | null {
  if (!CONTRACT_ADDRESS) {
    console.warn('CONTRACT_ADDRESS not set in environment');
    return null;
  }
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

/**
 * Get transaction receipt from blockchain
 */
export async function getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
  const provider = getProvider();
  try {
    return await provider.getTransactionReceipt(txHash);
  } catch (error) {
    console.error('Failed to get transaction receipt:', error);
    return null;
  }
}

/**
 * Get block timestamp for a transaction
 */
export async function getBlockTimestamp(txHash: string): Promise<number | null> {
  const receipt = await getTransactionReceipt(txHash);
  if (!receipt) return null;
  const block = await receipt.block;
  return block ? Number(block.timestamp) : null;
}

/**
 * Filter events by device ID
 */
export async function getDeviceEvents(
  deviceId: string,
  fromBlock: number = 0
): Promise<any[]> {
  const contract = getContract();
  if (!contract) return [];
  
  const filter = contract.filters.DeviceAction(
    ethers.encodeBytes32String(deviceId)
  );
  
  return await contract.queryFilter(filter, fromBlock);
}

/**
 * Filter events by user wallet address
 */
export async function getUserEvents(
  userAddress: string,
  fromBlock: number = 0
): Promise<any[]> {
  const contract = getContract();
  if (!contract) return [];
  
  const filter = contract.filters.DeviceAction(
    null,  // any deviceId
    null,  // any action
    null,  // any timestamp
    userAddress  // indexed user
  );
  
  return await contract.queryFilter(filter, fromBlock);
}

// Export config
export const config = {
  INFURA_SEPOLIA_URL,
  CONTRACT_ADDRESS,
  SEPOLIA_CHAIN_ID: '0xaa36a7',
  SEPOLIA_EXPLORER: 'https://sepolia.etherscan.io',
};

// Helper to get Etherscan link for transaction
export function getEtherscanTxLink(txHash: string): string {
  return `${config.SEPOLIA_EXPLORER}/tx/${txHash}`;
}

// Helper to get Etherscan link for address
export function getEtherscanAddressLink(address: string): string {
  return `${config.SEPOLIA_EXPLORER}/address/${address}`;
}
