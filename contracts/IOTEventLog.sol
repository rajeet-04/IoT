// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOTEventLog
 * @notice Records IoT device actions on the blockchain for immutable audit trail
 * @dev Events are emitted for each relay ON/OFF action
 *      Use Sepolia testnet for free transactions
 */
contract IOTEventLog {
    // Event emitted on each device action
    event DeviceAction(
        bytes32 indexed deviceId,
        string action,              // "on" or "off"
        uint256 timestamp,         // Block timestamp
        address indexed user,       // User's wallet address
        bytes32 indexed dbRecordId // Link to MongoDB record
    );
    
    /**
     * @notice Log a device action to the blockchain
     * @param deviceId Unique device identifier (bytes32 from string)
     * @param action Either "on" or "off"
     * @param dbRecordId MongoDB record ID for cross-referencing
     */
    function logAction(
        bytes32 deviceId,
        string calldata action,
        bytes32 dbRecordId
    ) external {
        require(
            keccak256(abi.encodePacked(action)) == keccak256(abi.encodePacked("on")) ||
            keccak256(abi.encodePacked(action)) == keccak256(abi.encodePacked("off")),
            "Invalid action: must be 'on' or 'off'"
        );
        
        emit DeviceAction(
            deviceId,
            action,
            block.timestamp,
            msg.sender,
            dbRecordId
        );
    }
    
    /**
     * @notice Query events for a specific device
     * @dev Use web3.eth.abi.decodeLog or ethers.js to parse events
     */
    function getDeviceHistory(
        bytes32 deviceId
    ) external view returns (bytes32[] memory, string[] memory, uint256[] memory) {
        // Event filtering is done at the client/indexing level
        // This function is a placeholder for future indexed storage
        revert("Use event logs for historical queries");
    }
}
