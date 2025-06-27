# Tatara MCP Server

A comprehensive Model Context Protocol (MCP) server for interacting with the Tatara blockchain ecosystem.

## Features

### 🏦 Core Wallet Operations
- Get wallet token balances (including Yearn vault positions)
- ETH/WETH balance checking
- ETH wrapping and unwrapping

### 🏪 Yearn Finance Integration
- Vault information retrieval
- Deposit into Yearn vaults
- Withdraw from Yearn vaults
- User position tracking

### 🍣 Sushi DEX Integration
- Pool information queries
- Token swapping with slippage protection
- Support for multiple fee tiers

### 🌉 Agglayer Bridge
- Cross-chain token bridging
- Support for Sepolia and Katana networks
- Automatic allowance management

## Prerequisites

- Node.js (v16 or higher)
- Access to Tatara RPC endpoint
- Private key for wallet operations
- MCP-compatible client (Claude Desktop, Continue, etc.)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <file name>
```

2. Install dependencies:
```bash
pnpm install
```

3. Create environment configuration (see Configuration section below)

## Configuration

### Environment Variables

The server requires the following environment variables:

```bash
# Required: Tatara RPC endpoint
TATARA_RPC_URL=https://your-tatara-rpc-endpoint.com

# Required: Private key for wallet operations (without 0x prefix)
WALLET_PRIVATE_KEY=your_private_key_here
```

### MCP Client Configuration

```json
{
  "mcpServers": {
    "tatara": {
      "command": "npx",
      "args": ["katana-mcp"],
      "env": {
        "TATARA_RPC_URL": "https://your-tatara-rpc-endpoint.com",
        "WALLET_PRIVATE_KEY": "your_private_key_here"
      }
    }
  }
}
```

## Available Tools

### 1. getWalletBalances
Get comprehensive token balance information for any wallet.

**Parameters:**
- `address` (string): Wallet address to check
- `additionalTokens` (array, optional): Additional token addresses
- `includeZeroBalances` (boolean, default: false): Include tokens with zero balance
- `includeYearnVaults` (boolean, default: true): Include Yearn vault balances

### 2. getEthWethBalances
Get ETH and WETH balances for a specific wallet.

**Parameters:**
- `address` (string): Wallet address to check

### 3. wrapEth
Wrap ETH to WETH using the configured wallet.

**Parameters:**
- `amount` (string): Amount of ETH to wrap (e.g., "0.1")

### 4. unwrapWeth
Unwrap WETH back to ETH using the configured wallet.

**Parameters:**
- `amount` (string): Amount of WETH to unwrap (e.g., "0.1")

### 5. getYearnVaultInfo
Get detailed information about Yearn vaults.

**Parameters:**
- `vaultAddress` (string, optional): Specific vault address (if not provided, returns all known vaults)

### 6. depositToYearnVault
Deposit tokens into a Yearn vault.

**Parameters:**
- `vaultAddress` (string): Address of the Yearn vault
- `amount` (string): Amount of underlying tokens to deposit

### 7. withdrawFromYearnVault
Withdraw tokens from a Yearn vault.

**Parameters:**
- `vaultAddress` (string): Address of the Yearn vault
- `amount` (string): Amount to withdraw
- `withdrawType` (enum): "assets" or "shares"

### 8. getUserYearnPositions
Get detailed information about a user's Yearn vault positions.

**Parameters:**
- `address` (string): Wallet address to check positions for

### 9. getSushiPoolInfo
Get information about a Sushi V3 pool.

**Parameters:**
- `tokenA` (string): Address of the first token
- `tokenB` (string): Address of the second token
- `fee` (number, default: 3000): Fee tier (500, 3000, or 10000)

### 10. swapTokens
Swap tokens using Sushi V3 DEX.

**Parameters:**
- `tokenIn` (string): Address of input token
- `tokenOut` (string): Address of output token
- `amountIn` (string): Amount of input tokens
- `slippageTolerance` (number, default: 0.5): Slippage tolerance percentage
- `fee` (number, default: 3000): Fee tier

### 11. bridgeTokens
Bridge tokens to another network using Agglayer Bridge.

**Parameters:**
- `tokenAddress` (string): Address of token to bridge
- `amount` (string): Amount to bridge
- `destinationNetwork` (enum): "SEPOLIA" or "KATANA"
- `destinationAddress` (string, optional): Destination address

## Contract Addresses

### Core Contracts
- **WETH**: `0x17B8Ee96E3bcB3b04b3e8334de4524520C51caB4`
- **Sushi Router**: `0xAC4c6e212A361c968F1725b4d055b47E63F80b75`
- **Sushi Factory**: `0x9B3336186a38E1b6c21955d112dbb0343Ee061eE`
- **Bridge**: `0x528e26b25a34a4A5d0dbDa1d57D318153d2ED582`

### Yearn Vaults
- **yvAUSD**: `0xAe4b2FCf45566893Ee5009BA36792D5078e4AD60`
- **yvWETH**: `0xccc0fc2e34428120f985b460b487eb79e3c6fa57`


## Network Information

- **Chain ID**: 129399
- **Name**: Tatara Testnet
- **Native Currency**: ETH


## Error Handling

The server includes comprehensive error handling for:
- Invalid addresses
- Insufficient balances
- Network connectivity issues
- Contract interaction failures
- Bridge operation errors

All errors are returned in a structured JSON format with descriptive messages.


## Development

### Project Structure
```
tatara-mcp-server/
├── index.js              # Main server file
├── package.json           # Dependencies
├── README.md             # This file
└── .env.example          # Environment variables template
```


## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request


## Support

For issues and questions:
- Open an issue on GitHub
- [Add other support channels]

