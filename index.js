const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { ethers } = require("ethers");

const ERC20ABI = [
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

const COMMON_BERACHAIN_TOKENS = [
  "0xFCBD14DC51f0A4d49d5E53C2E0950e0bC26d0Dce", // HONEY
  "0x549943e04f40284185054145c6E4e9568C1D3241", // USDC
  "0x656b95E550C07a9ffe548bd4085c72418Ceb1dba",
  "0xA4aFef880F5cE1f63c9fb48F661E27F8B4216401",
  "0x6969696969696969696969696969696969696969", // WBERA
  "0x0555E30da8f98308EdB960aa94C0Db47230D2B9c", // WBTC
  "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590"  // WETH
];

const BERACHAIN_CONFIG = {
  rpcUrl: "https://rpc.berachain.com",
  name: "Berachain",
  chainId: 80094,
  nativeToken: {
    symbol: "BERA",
    name: "Berachain Token",
    decimals: 18
  }
};

// Initialize MCP server
const server = new McpServer({
  name: "Berachain MCP",
  version: "1.0.0",
  description: "An MCP server for AI agents to interact with Berachain"
});

function getProvider() {
  try {
    return new ethers.providers.JsonRpcProvider(BERACHAIN_CONFIG.rpcUrl);
  } catch (error) {
    throw new Error(`Failed to connect to Berachain RPC: ${error.message}`);
  }
}

function formatBalance(balance, decimals) {
  return ethers.utils.formatUnits(balance, decimals);
}

// Tool: Get ALL token balances for a wallet address
server.tool(
  "getBalance",
  "Get ALL token balances for a wallet address on Berachain",
  {
    address: z.string().describe("Wallet address to check token balances for"),
    tokenAddress: z.string().optional().describe("Optional: Specific token address to check (if only checking one token)"),
    additionalTokens: z.array(z.string()).optional().describe("Optional: Additional token addresses to check"),
    includeZeroBalances: z.boolean().default(false).describe("Whether to include tokens with zero balance")
  },
  async ({ address, tokenAddress, additionalTokens, includeZeroBalances }) => {
    try {
      const provider = getProvider();

      const nativeBalance = await provider.getBalance(address);
      const formattedNativeBalance = formatBalance(nativeBalance, BERACHAIN_CONFIG.nativeToken.decimals);

      if (tokenAddress) {
        try {
          const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
          const balance = await tokenContract.balanceOf(address);
          
          if (!includeZeroBalances && balance.isZero()) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  address,
                  nativeToken: {
                    symbol: BERACHAIN_CONFIG.nativeToken.symbol,
                    balance: formattedNativeBalance,
                    rawBalance: nativeBalance.toString(),
                    hasBalance: !nativeBalance.isZero()
                  },
                  tokenCount: 0,
                  tokens: [],
                  message: "Requested token has zero balance",
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          }
          
          const [symbol, name, decimals] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.name(),
            tokenContract.decimals()
          ]);
          
          const token = {
            tokenAddress,
            symbol,
            name,
            balance: formatBalance(balance, decimals),
            rawBalance: balance.toString(),
            decimals,
            hasBalance: !balance.isZero()
          };
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                address,
                nativeToken: {
                  symbol: BERACHAIN_CONFIG.nativeToken.symbol,
                  balance: formattedNativeBalance,
                  rawBalance: nativeBalance.toString(),
                  hasBalance: !nativeBalance.isZero()
                },
                tokenCount: 1,
                tokens: [token],
                timestamp: new Date().toISOString()
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: `Failed to get token balance: ${error.message}`,
                tokenAddress,
                address
              }, null, 2)
            }]
          };
        }
      }
      
      let tokenAddressesToCheck = [...COMMON_BERACHAIN_TOKENS];

      if (additionalTokens && Array.isArray(additionalTokens) && additionalTokens.length > 0) {
        const newTokens = additionalTokens.filter(addr => 
          !tokenAddressesToCheck.includes(addr) && 
          ethers.utils.isAddress(addr)
        );
        tokenAddressesToCheck = [...tokenAddressesToCheck, ...newTokens];
      }
      
      const tokenPromises = tokenAddressesToCheck.map(async (tokenAddr) => {
        try {
          const tokenContract = new ethers.Contract(tokenAddr, ERC20ABI, provider);
          const balance = await tokenContract.balanceOf(address);
          
          if (!includeZeroBalances && balance.isZero()) {
            return null;
          }
          
          const [symbol, name, decimals] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.name(),
            tokenContract.decimals()
          ]);
          
          return {
            tokenAddress: tokenAddr,
            symbol,
            name,
            balance: formatBalance(balance, decimals),
            rawBalance: balance.toString(),
            decimals,
            hasBalance: !balance.isZero()
          };
        } catch (error) {
          return null;
        }
      });
      
      const tokenResults = await Promise.all(tokenPromises);
      const tokens = tokenResults.filter(result => result !== null);

      const result = {
        address,
        nativeToken: {
          symbol: BERACHAIN_CONFIG.nativeToken.symbol,
          balance: formattedNativeBalance,
          rawBalance: nativeBalance.toString(),
          hasBalance: !nativeBalance.isZero()
        },
        tokenCount: tokens.length,
        tokens: tokens,
        timestamp: new Date().toISOString()
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Failed to get wallet token balances: ${error.message}`,
            address
          }, null, 2)
        }]
      };
    }
  }
);

// Tool: Get ERC20 token supply
server.tool(
  "getTokenSupply",
  "Get total supply for an ERC20 token on Berachain",
  {
    tokenAddress: z.string().describe("ERC20 token contract address")
  },
  async ({ tokenAddress }) => {
    try {
      const provider = getProvider();
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
      
      const [symbol, name, decimals, totalSupply] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals(),
        tokenContract.totalSupply()
      ]);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            tokenAddress,
            tokenName: name,
            symbol,
            decimals,
            totalSupply: formatBalance(totalSupply, decimals),
            rawTotalSupply: totalSupply.toString()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Failed to get token supply: ${error.message}`,
            tokenAddress
          }, null, 2)
        }]
      };
    }
  }
);

// Tool: Get token info
server.tool(
  "getTokenInfo",
  "Get information about an ERC20 token on Berachain",
  {
    tokenAddress: z.string().describe("ERC20 token contract address on Berachain")
  },
  async ({ tokenAddress }) => {
    try {
      const provider = getProvider();
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
      
      const [symbol, name, decimals, totalSupply] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals(),
        tokenContract.totalSupply()
      ]);
      
      const formattedSupply = formatBalance(totalSupply, decimals);
      
      const tokenInfo = {
        tokenAddress,
        tokenName: name,
        symbol,
        decimals,
        totalSupply: formattedSupply,
        rawTotalSupply: totalSupply.toString(),
        network: {
          name: BERACHAIN_CONFIG.name,
          chainId: BERACHAIN_CONFIG.chainId
        },
        metadata: {
          formattedSupply: `${Number(formattedSupply).toLocaleString()} ${symbol}`,
          tokenType: "ERC20",
          timestamp: new Date().toISOString()
        }
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(tokenInfo, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Failed to get token information: ${error.message}`,
            tokenAddress
          }, null, 2)
        }]
      };
    }
  }
);

// Tool: Get transaction data
server.tool(
  "getTransactionData",
  "Get transaction data information on Berachain",
  {
    txHash: z.string().describe("Transaction hash to check")
  },
  async ({ txHash }) => {
    try {
      const provider = getProvider();
  
      const [transaction, receipt] = await Promise.all([
        provider.getTransaction(txHash),
        provider.getTransactionReceipt(txHash)
      ]);

      if (!transaction && !receipt) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "not found",
              message: "Transaction not found on the blockchain",
              txHash
            }, null, 2)
          }]
        };
      }
      
      if (transaction && !receipt) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "pending",
              message: "Transaction is pending",
              txHash,
              transaction: {
                hash: transaction.hash,
                from: transaction.from,
                to: transaction.to,
                value: formatBalance(transaction.value, 18),
                gasPrice: formatBalance(transaction.gasPrice, 9) + " Gwei",
                gasLimit: transaction.gasLimit.toString(),
                nonce: transaction.nonce,
                data: transaction.data,
                blockNumber: transaction.blockNumber
              }
            }, null, 2)
          }]
        };
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            txHash,
            blockNumber: receipt.blockNumber,
            blockHash: receipt.blockHash,
            status: receipt.status ? "success" : "failed",
            timestamp: transaction?.timestamp 
              ? new Date(transaction.timestamp * 1000).toISOString() 
              : undefined,
            from: receipt.from,
            to: receipt.to,
            contractAddress: receipt.contractAddress,
            value: transaction ? formatBalance(transaction.value, 18) + " " + BERACHAIN_CONFIG.nativeToken.symbol : "0",
            gasUsed: receipt.gasUsed.toString(),
            gasPrice: transaction ? formatBalance(transaction.gasPrice, 9) + " Gwei" : undefined,
            gasLimit: transaction ? transaction.gasLimit.toString() : undefined,
            nonce: transaction ? transaction.nonce : undefined,
            data: transaction ? transaction.data : undefined,
            logs: receipt.logs.map(log => ({
              address: log.address,
              topics: log.topics,
              data: log.data
            }))
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Failed to get transaction data: ${error.message}`,
            txHash
          }, null, 2)
        }]
      };
    }
  }
);

// Tool: Get block information by hash
server.tool(
  "getBlockInfo",
  "Get information about a block on Berachain using block hash",
  {
    blockHash: z.string().describe("Block hash (must start with 0x)")
  },
  async ({ blockHash }) => {
    try {
      const provider = getProvider();
      
      if (!blockHash.startsWith("0x")) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Invalid block hash format. Block hash must start with 0x.",
              requestedBlockHash: blockHash
            }, null, 2)
          }]
        };
      }

      const block = await provider.getBlock(blockHash);
      
      if (!block) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "not found",
              message: "Block with this hash was not found on the blockchain",
              requestedBlockHash: blockHash
            }, null, 2)
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            blockNumber: block.number,
            blockHash: block.hash,
            timestamp: new Date(block.timestamp * 1000).toISOString(),
            parentHash: block.parentHash,
            miner: block.miner,
            gasUsed: block.gasUsed.toString(),
            gasLimit: block.gasLimit.toString(),
            nonce: block.nonce || "0x0",
            difficulty: block.difficulty?.toString() || "0",
            extraData: block.extraData,
            transactions: block.transactions,
            transactionCount: block.transactions.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Failed to get block information: ${error.message}`,
            requestedBlockHash: blockHash
          }, null, 2)
        }]
      };
    }
  }
);

// Start the server
async function startServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Berachain MCP server started successfully");
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

startServer();