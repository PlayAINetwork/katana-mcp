
# Berachain MCP Server

An MCP server for AI agents to interact with the Berachain blockchain.

## Configuration

Add the following to your MCP configuration file:

```json
{
  "mcpServers": {
    "bera-mcp": {
      "command": "node",
      "args": ["F:/beramcp/bera-mcp/index.js"]
    }
  }
}
```

## Available Tools

### getBalance
**Description**: get all token balances for a wallet address on Berachain.

**Parameters**:
- `address` (required): The wallet address to check balances for
- `tokenAddress` (optional): A specific token address to check (if you only want one token's balance)
- `additional Token` (optional) : additional token addresses to check beyond the common tokens.

**Example Prompt**:
```
Get all token balances for wallet {address}
```

**Response**:
![Screenshot 2025-05-01 150407](https://github.com/user-attachments/assets/dd570f78-31d4-4790-b72c-6024b8837f7d)



### getTokenInfo
**Description**: Gets detailed information about an ERC20 token on Berachain.

**Parameters**:
- `tokenAddress` (required): ERC20 token contract address

**Example Prompt**:
```
Get information about token 0xFCBD14DC51f0A4d49d5E53C2E0950e0bC26d0Dce
```

**Response**:
![Screenshot 2025-05-01 143121](https://github.com/user-attachments/assets/b3a5ad1d-d3de-4395-b90a-0cdc9159ddf0)



### getTokenSupply
**Description**: Retrieves the total supply for an ERC20 token on Berachain.

**Parameters**:
- `tokenAddress` (required): ERC20 token contract address

**Example Prompt**:
```
What's the total supply of token 0xFCBD14DC51f0A4d49d5E53C2E0950e0bC26d0Dce
```

**Response**:
![Screenshot 2025-05-01 143030](https://github.com/user-attachments/assets/da072b65-0ce8-4bc9-852d-8ad18ecbea93)



### getTransactionData
**Description**: Gets detailed information about a transaction on Berachain.

**Parameters**:
- `txHash` (required): Transaction hash to check

**Example Prompt**:
```
Get transaction data for 0x123456789abcdef...
```

**Response**:
![Screenshot 2025-05-01 143248](https://github.com/user-attachments/assets/723e4a43-0aa8-479e-8ccf-0200a670d5ca)



### getBlockInfo
**Description**: Retrieves information about a block on Berachain using its hash.

**Parameters**:
- `blockHash` (required): Block hash 

**Example Prompt**:
```
Get information about block with hash 0x123456789abcdef...
```

**Response**:
![Screenshot 2025-05-01 143403](https://github.com/user-attachments/assets/25319c91-c294-447c-96f6-8f597324a60f)



## Features
- **Token Discovery**: Automatically discovers all tokens a wallet has.
- **Full Token Details**: Provides complete token information including name, symbol, decimals, and balances.
- **Comprehensive Transaction Data**: Includes detailed transaction information with gas usage, value, and logs.
- **Block Information**: Retrieves block details including timestamp, miner, and transactions.
