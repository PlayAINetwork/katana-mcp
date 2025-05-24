const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { ethers } = require("ethers");
const fetch = require("node-fetch");

const ERC20_ABI = [
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

const WETH_ABI = [
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function balanceOf(address account) external view returns (uint256)",
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

const ERC4626_ABI = [
  "function asset() external view returns (address)",
  "function totalAssets() external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function balanceOf(address account) external view returns (uint256)",
  "function convertToAssets(uint256 shares) external view returns (uint256)",
  "function previewDeposit(uint256 assets) external view returns (uint256)",
  "function previewWithdraw(uint256 assets) external view returns (uint256)",
  "function previewRedeem(uint256 shares) external view returns (uint256)",
  "function maxWithdraw(address owner) external view returns (uint256)",
  "function deposit(uint256 assets, address receiver) external returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) external returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) external returns (uint256)"
];

const SUSHI_ROUTER_ABI = [
  "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)",
  "function multicall(bytes[] calldata data) external payable returns (bytes[] memory results)"
];

const SUSHI_FACTORY_ABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
  "function feeAmountTickSpacing(uint24 fee) external view returns (int24)"
];

const SUSHI_POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function fee() external view returns (uint24)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function liquidity() external view returns (uint128)"
];

const BRIDGE_ABI = [
  "function bridgeAsset(uint32 destinationNetwork, address destinationAddress, uint256 amount, address token, bool forceUpdateGlobalExitRoot, bytes calldata permitData) external payable",
  "function bridgeMessage(uint32 destinationNetwork, address destinationAddress, bool forceUpdateGlobalExitRoot, bytes calldata metadata) external payable",
  "function claimAsset(bytes32[32] calldata smtProofLocalExitRoot, bytes32[32] calldata smtProofRollupExitRoot, uint256 globalIndex, bytes32 mainnetExitRoot, bytes32 rollupExitRoot, uint32 originNetwork, address originTokenAddress, uint32 destinationNetwork, address destinationAddress, uint256 amount, bytes calldata metadata) external",
  "function getTokenWrappedAddress(uint32 originNetwork, address originTokenAddress) external view returns (address)",
  "function calculateTokenWrapperAddress(uint32 originNetwork, address originTokenAddress, string calldata name, string calldata symbol, uint8 decimals) external view returns (address)"
];

const COMMON_TATARA_TOKENS = [
  "0x17B8Ee96E3bcB3b04b3e8334de4524520C51caB4",
  "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC"
];

const SUSHI_ADDRESSES = {
  router: "0xAC4c6e212A361c968F1725b4d055b47E63F80b75",
  factory: "0x9B3336186a38E1b6c21955d112dbb0343Ee061eE",
  positionManager: "0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C"
};

const TATARA_WETH_ADDRESS = "0x17B8Ee96E3bcB3b04b3e8334de4524520C51caB4";

const YEARN_VAULTS = {
  yvAUSD: {
    address: "0xAe4b2FCf45566893Ee5009BA36792D5078e4AD60",
    name: "Yearn AUSD Vault",
    symbol: "yvAUSD"
  },
  yvWETH: {
    address: "0xccc0fc2e34428120f985b460b487eb79e3c6fa57",
    name: "Yearn WETH Vault", 
    symbol: "yvWETH"
  }
};

const BRIDGE_CONFIG = {
  bridgeAddress: "0x528e26b25a34a4A5d0dbDa1d57D318153d2ED582",
  bridgeServiceAPI: "https://bridge.tatara.katanarpc.com",
  networks: {
    TATARA: {
      id: 129399,
      name: "Tatara Testnet"
    },
    SEPOLIA: {
      id: 11155111,
      name: "Sepolia Testnet"
    },
  }
};

const FEE_TIERS = {
  LOW: 500,      // 0.05%
  MEDIUM: 3000,  // 0.3%
  HIGH: 10000    // 1%
};

const TATARA_CONFIG = {
  id: 129399,
  name: 'Tatara Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH'
  },
  get rpcUrl() {
    const rpcUrl = process.env.TATARA_RPC_URL;
    if (!rpcUrl) {
      throw new Error("TATARA_RPC_URL environment variable is not set in MCP configuration");
    }
    return rpcUrl;
  }
};

//helper functions
function getProvider() {
  try {
    return new ethers.providers.JsonRpcProvider(TATARA_CONFIG.rpcUrl);
  } catch (error) {
    throw new Error(`Failed to connect to Tatara RPC: ${error.message}`);
  }
}

function getWallet(privateKey) {
  try {
    const provider = getProvider();
    return new ethers.Wallet(privateKey, provider);
  } catch (error) {
    throw new Error(`Failed to create wallet: ${error.message}`);
  }
}

function getDefaultWallet() {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("WALLET_PRIVATE_KEY environment variable is not set in MCP configuration");
  }
  
  try {
    return getWallet(privateKey);
  } catch (error) {
    if (privateKey.startsWith('0x')) {
      console.log("Private key with 0x failed, trying without 0x prefix...");
      return getWallet(privateKey.slice(2));
    }
    throw error;
  }
}

function formatBalance(balance, decimals) {
  return ethers.utils.formatUnits(balance, decimals);
}

function isValidAddress(address) {
  try {
    return ethers.utils.isAddress(address);
  } catch {
    return false;
  }
}

//mcp server initialization
const server = new McpServer({
  name: "Tatara MCP Complete",
  version: "1.0.0",
  description: "Complete MCP server for Tatara chain with Yearn, Sushi, and Agglayer Bridge"
});

//tool 1: get wallet balances
server.tool(
  "getWalletBalances",
  "Get token balances for a wallet address on Tatara chain, including Yearn vault positions",
  {
    address: z.string().describe("Wallet address to check token balances for"),
    additionalTokens: z.array(z.string()).optional().describe("Optional: Additional token addresses to check"),
    includeZeroBalances: z.boolean().default(false).describe("Whether to include tokens with zero balance"),
    includeYearnVaults: z.boolean().default(true).describe("Whether to include Yearn vault balances")
  },
  async ({ address, additionalTokens, includeZeroBalances, includeYearnVaults }) => {
    try {
      if (!isValidAddress(address)) {
        throw new Error(`Invalid wallet address: ${address}`);
      }

      const provider = getProvider();
      const nativeBalance = await provider.getBalance(address);
      const formattedNativeBalance = formatBalance(nativeBalance, TATARA_CONFIG.nativeCurrency.decimals);

      let tokenAddressesToCheck = [...COMMON_TATARA_TOKENS];
      if (includeYearnVaults) {
        tokenAddressesToCheck.push(...Object.values(YEARN_VAULTS).map(v => v.address));
      }
      
      if (additionalTokens && Array.isArray(additionalTokens) && additionalTokens.length > 0) {
        const newTokens = additionalTokens.filter(addr => 
          !tokenAddressesToCheck.includes(addr) && 
          isValidAddress(addr)
        );
        tokenAddressesToCheck = [...tokenAddressesToCheck, ...newTokens];
      }
    
      const tokenPromises = tokenAddressesToCheck.map(async (tokenAddr) => {
        try {
          const tokenContract = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
          const balance = await tokenContract.balanceOf(address);
          
          const [symbol, name, decimals] = await Promise.all([
            tokenContract.symbol().catch(() => "UNKNOWN"),
            tokenContract.name().catch(() => "Unknown Token"),
            tokenContract.decimals().catch(() => 18)
          ]);
          
          const isYearnVault = Object.values(YEARN_VAULTS).some(v => v.address.toLowerCase() === tokenAddr.toLowerCase());
          let vaultInfo = null;
          
          if (isYearnVault && !balance.isZero()) {
            try {
              const vaultContract = new ethers.Contract(tokenAddr, ERC4626_ABI, provider);
              const underlyingValue = await vaultContract.convertToAssets(balance);
              const underlyingAsset = await vaultContract.asset();
              
              vaultInfo = {
                underlyingAsset,
                underlyingValue: formatBalance(underlyingValue, decimals),
                shareBalance: formatBalance(balance, decimals)
              };
            } catch (vaultError) {
              console.error(`Error getting vault info for ${tokenAddr}:`, vaultError.message);
            }
          }
          
          return {
            tokenAddress: tokenAddr,
            symbol,
            name,
            balance: formatBalance(balance, decimals),
            hasBalance: !balance.isZero(),
            isYearnVault,
            vaultInfo
          };
        } catch (error) {
          console.error(`Error getting balance for token ${tokenAddr}:`, error.message);
          return null;
        }
      });
      
      const tokenResults = await Promise.all(tokenPromises);
      const tokens = tokenResults.filter(result => result !== null);
      const filteredTokens = includeZeroBalances ? tokens : tokens.filter(token => token.hasBalance);

      const result = {
        address,
        nativeToken: {
          symbol: TATARA_CONFIG.nativeCurrency.symbol,
          name: TATARA_CONFIG.nativeCurrency.name,
          balance: formattedNativeBalance,
          hasBalance: !nativeBalance.isZero()
        },
        tokenCount: filteredTokens.length,
        tokens: filteredTokens,
        yearnVaults: filteredTokens.filter(t => t.isYearnVault),
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

//tool 2: get eth and weth balances from wallet
server.tool(
  "getEthWethBalances",
  "Get ETH and WETH balances for a wallet address on Tatara",
  {
    address: z.string().describe("Wallet address to check balances for")
  },
  async ({ address }) => {
    try {
      if (!isValidAddress(address)) {
        throw new Error(`Invalid wallet address: ${address}`);
      }

      const provider = getProvider();
      const ethBalance = await provider.getBalance(address);
      const formattedEthBalance = formatBalance(ethBalance, TATARA_CONFIG.nativeCurrency.decimals);

      const wethContract = new ethers.Contract(TATARA_WETH_ADDRESS, ERC20_ABI, provider);
      
      try {
        const wethBalance = await wethContract.balanceOf(address);
        
        const [symbol, name, decimals] = await Promise.all([
          wethContract.symbol().catch(() => "WETH"),
          wethContract.name().catch(() => "Wrapped Ether"),
          wethContract.decimals().catch(() => 18)
        ]);
        
        const formattedWethBalance = formatBalance(wethBalance, decimals);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              address,
              ethBalance: {
                symbol: TATARA_CONFIG.nativeCurrency.symbol,
                name: TATARA_CONFIG.nativeCurrency.name,
                balance: formattedEthBalance,
                hasBalance: !ethBalance.isZero()
              },
              wethBalance: {
                tokenAddress: TATARA_WETH_ADDRESS,
                symbol,
                name,
                balance: formattedWethBalance,
                hasBalance: !wethBalance.isZero()
              },
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (wethError) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              address,
              ethBalance: {
                symbol: TATARA_CONFIG.nativeCurrency.symbol,
                name: TATARA_CONFIG.nativeCurrency.name,
                balance: formattedEthBalance,
                hasBalance: !ethBalance.isZero()
              },
              wethBalance: {
                status: "error",
                message: `Failed to get WETH balance: ${wethError.message}`,
                tokenAddress: TATARA_WETH_ADDRESS
              },
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Failed to get ETH/WETH balances: ${error.message}`,
            address
          }, null, 2)
        }]
      };
    }
  }
);

//tool 3: wrap eth to weth
server.tool(
  "wrapEth",
  "Wrap ETH to WETH on Tatara chain using wallet from environment variable",
  {
    amount: z.string().describe("Amount of ETH to wrap (in ETH units, e.g., '0.1')")
  },
  async ({ amount }) => {
    try {
      const wallet = getDefaultWallet();
      const walletAddress = wallet.address;

      const ethAmount = ethers.utils.parseEther(amount);
      if (ethAmount.lte(0)) {
        throw new Error("Amount must be greater than 0");
      }

      const ethBalance = await wallet.getBalance();
      if (ethBalance.lt(ethAmount)) {
        throw new Error(`Insufficient ETH balance. Required: ${amount} ETH, Available: ${formatBalance(ethBalance, 18)} ETH`);
      }

      const wethContract = new ethers.Contract(TATARA_WETH_ADDRESS, WETH_ABI, wallet);
      const initialEthBalance = await wallet.getBalance();
      const initialWethBalance = await wethContract.balanceOf(walletAddress);

      const tx = await wethContract.deposit({
        value: ethAmount,
        gasLimit: 100000
      });

      const receipt = await tx.wait();
      const finalEthBalance = await wallet.getBalance();
      const finalWethBalance = await wethContract.balanceOf(walletAddress);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            walletAddress,
            wethAddress: TATARA_WETH_ADDRESS,
            amountWrapped: amount,
            balanceChanges: {
              ethBalance: {
                before: formatBalance(initialEthBalance, 18),
                after: formatBalance(finalEthBalance, 18),
                change: formatBalance(initialEthBalance.sub(finalEthBalance), 18)
              },
              wethBalance: {
                before: formatBalance(initialWethBalance, 18),
                after: formatBalance(finalWethBalance, 18),
                change: formatBalance(finalWethBalance.sub(initialWethBalance), 18)
              }
            },
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
            message: `Failed to wrap ETH: ${error.message}`,
            wethAddress: TATARA_WETH_ADDRESS,
            amount
          }, null, 2)
        }]
      };
    }
  }
);

//tool 4: unwrap weth to eth
server.tool(
  "unwrapWeth",
  "Unwrap WETH back to ETH on Tatara chain using wallet from environment variable",
  {
    amount: z.string().describe("Amount of WETH to unwrap (in WETH units, e.g., '0.1')")
  },
  async ({ amount }) => {
    try {
      const wallet = getDefaultWallet();
      const walletAddress = wallet.address;

      const wethAmount = ethers.utils.parseEther(amount);
      if (wethAmount.lte(0)) {
        throw new Error("Amount must be greater than 0");
      }

      const wethContract = new ethers.Contract(TATARA_WETH_ADDRESS, WETH_ABI, wallet);
      const wethBalance = await wethContract.balanceOf(walletAddress);
      if (wethBalance.lt(wethAmount)) {
        throw new Error(`Insufficient WETH balance. Required: ${amount} WETH, Available: ${formatBalance(wethBalance, 18)} WETH`);
      }

      const initialEthBalance = await wallet.getBalance();
      const initialWethBalance = await wethContract.balanceOf(walletAddress);

      const tx = await wethContract.withdraw(wethAmount, {
        gasLimit: 100000
      });

      const receipt = await tx.wait();

      const finalEthBalance = await wallet.getBalance();
      const finalWethBalance = await wethContract.balanceOf(walletAddress);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            walletAddress,
            wethAddress: TATARA_WETH_ADDRESS,
            amountUnwrapped: amount,
            balanceChanges: {
              ethBalance: {
                before: formatBalance(initialEthBalance, 18),
                after: formatBalance(finalEthBalance, 18),
                change: formatBalance(finalEthBalance.sub(initialEthBalance), 18)
              },
              wethBalance: {
                before: formatBalance(initialWethBalance, 18),
                after: formatBalance(finalWethBalance, 18),
                change: formatBalance(initialWethBalance.sub(finalWethBalance), 18)
              }
            },
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
            message: `Failed to unwrap WETH: ${error.message}`,
            wethAddress: TATARA_WETH_ADDRESS,
            amount
          }, null, 2)
        }]
      };
    }
  }
);

//tool 5: get yearn vault info
server.tool(
  "getYearnVaultInfo",
  "Get detailed information about Yearn vaults on Tatara",
  {
    vaultAddress: z.string().optional().describe("Specific vault address to query (optional - if not provided, returns info for all known vaults)")
  },
  async ({ vaultAddress }) => {
    try {
      const provider = getProvider();
      let vaultsToQuery = [];
      
      if (vaultAddress) {
        if (!isValidAddress(vaultAddress)) {
          throw new Error(`Invalid vault address: ${vaultAddress}`);
        }
        vaultsToQuery.push({ address: vaultAddress, symbol: "Unknown", name: "Unknown Vault" });
      } else {
        vaultsToQuery = Object.values(YEARN_VAULTS);
      }

      const vaultInfoPromises = vaultsToQuery.map(async (vault) => {
        try {
          const vaultContract = new ethers.Contract(vault.address, ERC4626_ABI, provider);
          
          const [
            asset,
            totalAssets,
            totalSupply,
            symbol,
            name,
            decimals
          ] = await Promise.all([
            vaultContract.asset(),
            vaultContract.totalAssets(),
            vaultContract.totalSupply(),
            vaultContract.symbol().catch(() => vault.symbol),
            vaultContract.name().catch(() => vault.name),
            vaultContract.decimals().catch(() => 18)
          ]);

          const assetContract = new ethers.Contract(asset, ERC20_ABI, provider);
          const [assetSymbol, assetName, assetDecimals] = await Promise.all([
            assetContract.symbol().catch(() => "UNKNOWN"),
            assetContract.name().catch(() => "Unknown Asset"),
            assetContract.decimals().catch(() => 18)
          ]);

          let sharePrice = "0";
          if (!totalSupply.isZero()) {
            const pricePerShare = await vaultContract.convertToAssets(ethers.utils.parseUnits("1", decimals));
            sharePrice = formatBalance(pricePerShare, assetDecimals);
          }

          return {
            vaultAddress: vault.address,
            vaultSymbol: symbol,
            vaultName: name,
            vaultDecimals: decimals,
            underlyingAsset: {
              address: asset,
              symbol: assetSymbol,
              name: assetName,
              decimals: assetDecimals
            },
            totalAssets: formatBalance(totalAssets, assetDecimals),
            totalSupply: formatBalance(totalSupply, decimals),
            sharePrice: sharePrice,
            status: "active"
          };
        } catch (error) {
          return {
            vaultAddress: vault.address,
            vaultSymbol: vault.symbol,
            vaultName: vault.name,
            status: "error",
            error: error.message
          };
        }
      });

      const vaultInfos = await Promise.all(vaultInfoPromises);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            vaults: vaultInfos,
            totalVaults: vaultInfos.length,
            activeVaults: vaultInfos.filter(v => v.status === "active").length,
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
            message: `Failed to get vault info: ${error.message}`,
            vaultAddress
          }, null, 2)
        }]
      };
    }
  }
);

//tool 6: deposit to yearn vault
server.tool(
  "depositToYearnVault",
  "Deposit tokens into a Yearn vault on Tatara chain",
  {
    vaultAddress: z.string().describe("Address of the Yearn vault to deposit into"),
    amount: z.string().describe("Amount of underlying tokens to deposit (in token units, e.g., '1.5')")
  },
  async ({ vaultAddress, amount }) => {
    try {
      if (!isValidAddress(vaultAddress)) {
        throw new Error(`Invalid vault address: ${vaultAddress}`);
      }

      const wallet = getDefaultWallet();
      const walletAddress = wallet.address;

      const vaultContract = new ethers.Contract(vaultAddress, ERC4626_ABI, wallet);
      
      const [asset, vaultSymbol, vaultDecimals] = await Promise.all([
        vaultContract.asset(),
        vaultContract.symbol().catch(() => "yvToken"),
        vaultContract.decimals().catch(() => 18)
      ]);

      const assetContract = new ethers.Contract(asset, ERC20_ABI, wallet);
      const [assetSymbol, assetDecimals] = await Promise.all([
        assetContract.symbol().catch(() => "UNKNOWN"),
        assetContract.decimals().catch(() => 18)
      ]);

      const depositAmount = ethers.utils.parseUnits(amount, assetDecimals);
      if (depositAmount.lte(0)) {
        throw new Error("Amount must be greater than 0");
      }

      const assetBalance = await assetContract.balanceOf(walletAddress);
      if (assetBalance.lt(depositAmount)) {
        throw new Error(`Insufficient ${assetSymbol} balance. Required: ${amount}, Available: ${formatBalance(assetBalance, assetDecimals)}`);
      }

      const currentAllowance = await assetContract.allowance(walletAddress, vaultAddress);
      if (currentAllowance.lt(depositAmount)) {
        const approveTx = await assetContract.approve(vaultAddress, depositAmount, {
          gasLimit: 100000
        });
        await approveTx.wait();
      }

      const initialAssetBalance = await assetContract.balanceOf(walletAddress);
      const initialVaultBalance = await vaultContract.balanceOf(walletAddress);
      const expectedShares = await vaultContract.previewDeposit(depositAmount);

      const tx = await vaultContract.deposit(depositAmount, walletAddress, {
        gasLimit: 200000
      });

      const receipt = await tx.wait();

      const finalAssetBalance = await assetContract.balanceOf(walletAddress);
      const finalVaultBalance = await vaultContract.balanceOf(walletAddress);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            walletAddress,
            vaultAddress,
            vaultSymbol,
            underlyingAsset: {
              address: asset,
              symbol: assetSymbol
            },
            amountDeposited: amount,
            expectedShares: formatBalance(expectedShares, vaultDecimals),
            actualShares: formatBalance(finalVaultBalance.sub(initialVaultBalance), vaultDecimals),
            balanceChanges: {
              assetBalance: {
                after: formatBalance(finalAssetBalance, assetDecimals),
                change: formatBalance(initialAssetBalance.sub(finalAssetBalance), assetDecimals)
              },
              vaultBalance: {
                before: formatBalance(initialVaultBalance, vaultDecimals),
                after: formatBalance(finalVaultBalance, vaultDecimals),
                change: formatBalance(finalVaultBalance.sub(initialVaultBalance), vaultDecimals)
              }
            },
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
            message: `Failed to deposit to vault: ${error.message}`,
            vaultAddress,
            amount
          }, null, 2)
        }]
      };
    }
  }
);

//tool 7: withdraw from yearn vault
server.tool(
  "withdrawFromYearnVault",
  "Withdraw tokens from a Yearn vault on Tatara chain",
  {
    vaultAddress: z.string().describe("Address of the Yearn vault to withdraw from"),
    amount: z.string().describe("Amount of underlying tokens to withdraw (in token units, e.g., '1.5')"),
    withdrawType: z.enum(["assets", "shares"]).default("assets").describe("Whether to withdraw by asset amount or share amount")
  },
  async ({ vaultAddress, amount, withdrawType }) => {
    try {
      if (!isValidAddress(vaultAddress)) {
        throw new Error(`Invalid vault address: ${vaultAddress}`);
      }

      const wallet = getDefaultWallet();
      const walletAddress = wallet.address;

      const vaultContract = new ethers.Contract(vaultAddress, ERC4626_ABI, wallet);

      const [asset, vaultSymbol, vaultDecimals] = await Promise.all([
        vaultContract.asset(),
        vaultContract.symbol().catch(() => "yvToken"),
        vaultContract.decimals().catch(() => 18)
      ]);

      const assetContract = new ethers.Contract(asset, ERC20_ABI, wallet);
      const [assetSymbol, assetDecimals] = await Promise.all([
        assetContract.symbol().catch(() => "UNKNOWN"),
        assetContract.decimals().catch(() => 18)
      ]);

      const initialAssetBalance = await assetContract.balanceOf(walletAddress);
      const initialVaultBalance = await vaultContract.balanceOf(walletAddress);

      let tx, expectedAssets, expectedShares;

      if (withdrawType === "assets") {
        const withdrawAmount = ethers.utils.parseUnits(amount, assetDecimals);
        if (withdrawAmount.lte(0)) {
          throw new Error("Amount must be greater than 0");
        }

        const maxWithdraw = await vaultContract.maxWithdraw(walletAddress);
        if (withdrawAmount.gt(maxWithdraw)) {
          throw new Error(`Insufficient vault position. Requested: ${amount}, Available: ${formatBalance(maxWithdraw, assetDecimals)}`);
        }

        expectedShares = await vaultContract.previewWithdraw(withdrawAmount);
        expectedAssets = withdrawAmount;

        tx = await vaultContract.withdraw(withdrawAmount, walletAddress, walletAddress, {
          gasLimit: 200000
        });
      } else {
        const shareAmount = ethers.utils.parseUnits(amount, vaultDecimals);
        if (shareAmount.lte(0)) {
          throw new Error("Amount must be greater than 0");
        }

        if (initialVaultBalance.lt(shareAmount)) {
          throw new Error(`Insufficient vault shares. Requested: ${amount}, Available: ${formatBalance(initialVaultBalance, vaultDecimals)}`);
        }

        expectedAssets = await vaultContract.previewRedeem(shareAmount);
        expectedShares = shareAmount;

        tx = await vaultContract.redeem(shareAmount, walletAddress, walletAddress, {
          gasLimit: 200000
        });
      }

      const receipt = await tx.wait();

      const finalAssetBalance = await assetContract.balanceOf(walletAddress);
      const finalVaultBalance = await vaultContract.balanceOf(walletAddress);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            walletAddress,
            vaultAddress,
            vaultSymbol,
            underlyingAsset: {
              address: asset,
              symbol: assetSymbol
            },
            withdrawType,
            amountRequested: amount,
            expectedAssets: formatBalance(expectedAssets, assetDecimals),
            expectedShares: formatBalance(expectedShares, vaultDecimals),
            actualAssets: formatBalance(finalAssetBalance.sub(initialAssetBalance), assetDecimals),
            actualShares: formatBalance(initialVaultBalance.sub(finalVaultBalance), vaultDecimals),
            balanceChanges: {
              assetBalance: {
                before: formatBalance(initialAssetBalance, assetDecimals),
                after: formatBalance(finalAssetBalance, assetDecimals),
                change: formatBalance(finalAssetBalance.sub(initialAssetBalance), assetDecimals)
              },
              vaultBalance: {
                before: formatBalance(initialVaultBalance, vaultDecimals),
                after: formatBalance(finalVaultBalance, vaultDecimals),
                change: formatBalance(initialVaultBalance.sub(finalVaultBalance), vaultDecimals)
              }
            },
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
            message: `Failed to withdraw from vault: ${error.message}`,
            vaultAddress,
            amount,
            withdrawType
          }, null, 2)
        }]
      };
    }
  }
);

//tool 8: get user's yearn vault positions
server.tool(
  "getUserYearnPositions",
  "Get detailed information about a user's positions in Yearn vaults",
  {
    address: z.string().describe("Wallet address to check Yearn positions for")
  },
  async ({ address }) => {
    try {
      if (!isValidAddress(address)) {
        throw new Error(`Invalid wallet address: ${address}`);
      }

      const provider = getProvider();
      const vaultAddresses = Object.values(YEARN_VAULTS).map(v => v.address);

      const positionPromises = vaultAddresses.map(async (vaultAddress) => {
        try {
          const vaultContract = new ethers.Contract(vaultAddress, ERC4626_ABI, provider);
          const shareBalance = await vaultContract.balanceOf(address);

          if (shareBalance.isZero()) {
            return null;
          }

          const [
            asset,
            vaultSymbol,
            vaultName,
            vaultDecimals,
            underlyingValue,
            totalAssets,
            totalSupply
          ] = await Promise.all([
            vaultContract.asset(),
            vaultContract.symbol().catch(() => "yvToken"),
            vaultContract.name().catch(() => "Yearn Vault"),
            vaultContract.decimals().catch(() => 18),
            vaultContract.convertToAssets(shareBalance),
            vaultContract.totalAssets(),
            vaultContract.totalSupply()
          ]);

          const assetContract = new ethers.Contract(asset, ERC20_ABI, provider);
          const [assetSymbol, assetName, assetDecimals] = await Promise.all([
            assetContract.symbol().catch(() => "UNKNOWN"),
            assetContract.name().catch(() => "Unknown Asset"),
            assetContract.decimals().catch(() => 18)
          ]);

          const sharePercentage = totalSupply.isZero() ? 0 : 
            (shareBalance.mul(10000).div(totalSupply).toNumber() / 100);

          return {
            vaultAddress,
            vaultSymbol,
            vaultName,
            underlyingAsset: {
              address: asset,
              symbol: assetSymbol,
              name: assetName
            },
            userPosition: {
              shareBalance: formatBalance(shareBalance, vaultDecimals),
              underlyingValue: formatBalance(underlyingValue, assetDecimals),
              shareOfVault: `${sharePercentage.toFixed(4)}%`
            },
            vaultMetrics: {
              totalAssets: formatBalance(totalAssets, assetDecimals),
              totalSupply: formatBalance(totalSupply, vaultDecimals),
              sharePrice: formatBalance(
                totalSupply.isZero() ? ethers.utils.parseUnits("1", assetDecimals) :
                totalAssets.mul(ethers.utils.parseUnits("1", vaultDecimals)).div(totalSupply),
                assetDecimals
              )
            }
          };
        } catch (error) {
          console.error(`Error getting position for vault ${vaultAddress}:`, error.message);
          return null;
        }
      });

      const positions = (await Promise.all(positionPromises)).filter(p => p !== null);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            address,
            totalPositions: positions.length,
            positions,
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
            message: `Failed to get Yearn positions: ${error.message}`,
            address
          }, null, 2)
        }]
      };
    }
  }
);

//tool 9: get sushi pool info
server.tool(
  "getSushiPoolInfo",
  "Get information about a Sushi V3 pool on Tatara",
  {
    tokenA: z.string().describe("Address of the first token"),
    tokenB: z.string().describe("Address of the second token"),
    fee: z.number().default(3000).describe("Fee tier (500 for 0.05%, 3000 for 0.3%, 10000 for 1%)")
  },
  async ({ tokenA, tokenB, fee }) => {
    try {
      if (!isValidAddress(tokenA) || !isValidAddress(tokenB)) {
        throw new Error("Invalid token addresses provided");
      }

      const provider = getProvider();
      const factoryContract = new ethers.Contract(SUSHI_ADDRESSES.factory, SUSHI_FACTORY_ABI, provider);

      const poolAddress = await factoryContract.getPool(tokenA, tokenB, fee);
      
      if (poolAddress === ethers.constants.AddressZero) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Pool does not exist for this token pair and fee tier",
              tokenA,
              tokenB,
              fee
            }, null, 2)
          }]
        };
      }

      const poolContract = new ethers.Contract(poolAddress, SUSHI_POOL_ABI, provider);
      
      const [slot0, liquidity, token0Address, token1Address] = await Promise.all([
        poolContract.slot0(),
        poolContract.liquidity(),
        poolContract.token0(),
        poolContract.token1()
      ]);

      const token0Contract = new ethers.Contract(token0Address, ERC20_ABI, provider);
      const token1Contract = new ethers.Contract(token1Address, ERC20_ABI, provider);

      const [token0Symbol, token0Decimals, token1Symbol, token1Decimals] = await Promise.all([
        token0Contract.symbol().catch(() => "UNKNOWN"),
        token0Contract.decimals().catch(() => 18),
        token1Contract.symbol().catch(() => "UNKNOWN"),
        token1Contract.decimals().catch(() => 18)
      ]);

      const sqrtPriceX96 = slot0.sqrtPriceX96;
      const price = Math.pow(sqrtPriceX96.div(ethers.BigNumber.from(2).pow(96)).toNumber(), 2);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            poolAddress,
            token0: {
              address: token0Address,
              symbol: token0Symbol,
              decimals: token0Decimals
            },
            token1: {
              address: token1Address,
              symbol: token1Symbol,
              decimals: token1Decimals
            },
            fee,
            currentPrice: price.toString(),
            sqrtPriceX96: sqrtPriceX96.toString(),
            tick: slot0.tick,
            liquidity: liquidity.toString(),
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
            message: `Failed to get pool info: ${error.message}`,
            tokenA,
            tokenB,
            fee
          }, null, 2)
        }]
      };
    }
  }
);

//tool 10: swap tokens on sushi
server.tool(
  "swapTokens",
  "Swap tokens using Sushi V3 on Tatara chain",
  {
    tokenIn: z.string().describe("Address of the input token"),
    tokenOut: z.string().describe("Address of the output token"),
    amountIn: z.string().describe("Amount of input tokens to swap (in token units, e.g., '1.5')"),
    slippageTolerance: z.number().default(0.5).describe("Slippage tolerance as percentage (e.g., 0.5 for 0.5%)"),
    fee: z.number().default(3000).describe("Fee tier (500 for 0.05%, 3000 for 0.3%, 10000 for 1%)")
  },
  async ({ tokenIn, tokenOut, amountIn, slippageTolerance, fee }) => {
    try {
      if (!isValidAddress(tokenIn) || !isValidAddress(tokenOut)) {
        throw new Error("Invalid token addresses provided");
      }

      const wallet = getDefaultWallet();
      const walletAddress = wallet.address;
      const provider = getProvider();

      const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
      const tokenOutContract = new ethers.Contract(tokenOut, ERC20_ABI, provider);

      const [tokenInSymbol, tokenInDecimals, tokenOutSymbol, tokenOutDecimals] = await Promise.all([
        tokenInContract.symbol().catch(() => "UNKNOWN"),
        tokenInContract.decimals().catch(() => 18),
        tokenOutContract.symbol().catch(() => "UNKNOWN"),
        tokenOutContract.decimals().catch(() => 18)
      ]);

      const amountInParsed = ethers.utils.parseUnits(amountIn, tokenInDecimals);
      if (amountInParsed.lte(0)) {
        throw new Error("Amount must be greater than 0");
      }

      const tokenInBalance = await tokenInContract.balanceOf(walletAddress);
      if (tokenInBalance.lt(amountInParsed)) {
        throw new Error(`Insufficient ${tokenInSymbol} balance. Required: ${amountIn}, Available: ${formatBalance(tokenInBalance, tokenInDecimals)}`);
      }

      const factoryContract = new ethers.Contract(SUSHI_ADDRESSES.factory, SUSHI_FACTORY_ABI, provider);
      const poolAddress = await factoryContract.getPool(tokenIn, tokenOut, fee);
      
      if (poolAddress === ethers.constants.AddressZero) {
        throw new Error(`No pool exists for ${tokenInSymbol}/${tokenOutSymbol} with ${fee/10000}% fee`);
      }

      const routerContract = new ethers.Contract(SUSHI_ADDRESSES.router, SUSHI_ROUTER_ABI, wallet);
      const currentAllowance = await tokenInContract.allowance(walletAddress, SUSHI_ADDRESSES.router);
      
      if (currentAllowance.lt(amountInParsed)) {
        console.log("Setting router allowance...");
        const approveTx = await tokenInContract.approve(SUSHI_ADDRESSES.router, amountInParsed, {
          gasLimit: 100000
        });
        await approveTx.wait();
      }

      const poolContract = new ethers.Contract(poolAddress, SUSHI_POOL_ABI, provider);
      const slot0 = await poolContract.slot0();
      
      const estimatedAmountOut = amountInParsed.div(100); 
      const minAmountOut = estimatedAmountOut.mul(10000 - slippageTolerance * 100).div(10000);

      const initialTokenInBalance = await tokenInContract.balanceOf(walletAddress);
      const initialTokenOutBalance = await tokenOutContract.balanceOf(walletAddress);

      const deadline = Math.floor(Date.now() / 1000) + 1800;
      const swapParams = {
        tokenIn,
        tokenOut,
        fee,
        recipient: walletAddress,
        deadline,
        amountIn: amountInParsed,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0
      };

      const tx = await routerContract.exactInputSingle(swapParams, {
        gasLimit: 300000
      });

      const receipt = await tx.wait();

      const finalTokenInBalance = await tokenInContract.balanceOf(walletAddress);
      const finalTokenOutBalance = await tokenOutContract.balanceOf(walletAddress);

      const actualAmountIn = initialTokenInBalance.sub(finalTokenInBalance);
      const actualAmountOut = finalTokenOutBalance.sub(initialTokenOutBalance);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            walletAddress,
            poolAddress,
            swap: {
              tokenIn: {
                address: tokenIn,
                symbol: tokenInSymbol,
                amountIn: formatBalance(actualAmountIn, tokenInDecimals)
              },
              tokenOut: {
                address: tokenOut,
                symbol: tokenOutSymbol,
                amountOut: formatBalance(actualAmountOut, tokenOutDecimals)
              },
              fee: `${fee/10000}%`,
              slippageTolerance: `${slippageTolerance}%`
            },
            balanceChanges: {
              tokenInBalance: {
                before: formatBalance(initialTokenInBalance, tokenInDecimals),
                after: formatBalance(finalTokenInBalance, tokenInDecimals),
                change: formatBalance(actualAmountIn.mul(-1), tokenInDecimals)
              },
              tokenOutBalance: {
                before: formatBalance(initialTokenOutBalance, tokenOutDecimals),
                after: formatBalance(finalTokenOutBalance, tokenOutDecimals),
                change: formatBalance(actualAmountOut, tokenOutDecimals)
              }
            },
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
            message: `Failed to swap tokens: ${error.message}`,
            tokenIn,
            tokenOut,
            amountIn,
            fee
          }, null, 2)
        }]
      };
    }
  }
);

//tool 11: bridge tokens
server.tool(
  "bridgeTokens",
  "Bridge tokens from Tatara to another network using Agglayer Bridge",
  {
    tokenAddress: z.string().describe("Address of the token to bridge"),
    amount: z.string().describe("Amount of tokens to bridge (in token units, e.g., '1.5')"),
    destinationNetwork: z.enum(["SEPOLIA", "KATANA"]).describe("Destination network"),
    destinationAddress: z.string().optional().describe("Destination address (defaults to same address)")
  },
  async ({ tokenAddress, amount, destinationNetwork, destinationAddress }) => {
    try {
      if (!isValidAddress(tokenAddress)) {
        throw new Error("Invalid token address provided");
      }

      const wallet = getDefaultWallet();
      const walletAddress = wallet.address;
      const destAddress = destinationAddress || walletAddress;

      if (!isValidAddress(destAddress)) {
        throw new Error("Invalid destination address provided");
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

      const [tokenSymbol, tokenDecimals] = await Promise.all([
        tokenContract.symbol().catch(() => "UNKNOWN"),
        tokenContract.decimals().catch(() => 18)
      ]);

      const bridgeAmount = ethers.utils.parseUnits(amount, tokenDecimals);
      if (bridgeAmount.lte(0)) {
        throw new Error("Amount must be greater than 0");
      }

      const tokenBalance = await tokenContract.balanceOf(walletAddress);
      if (tokenBalance.lt(bridgeAmount)) {
        throw new Error(`Insufficient ${tokenSymbol} balance. Required: ${amount}, Available: ${formatBalance(tokenBalance, tokenDecimals)}`);
      }

      const destNetworkId = BRIDGE_CONFIG.networks[destinationNetwork].id;
      
      const bridgeContract = new ethers.Contract(BRIDGE_CONFIG.bridgeAddress, BRIDGE_ABI, wallet);
      const currentAllowance = await tokenContract.allowance(walletAddress, BRIDGE_CONFIG.bridgeAddress);
      if (currentAllowance.lt(bridgeAmount)) {
        console.log("Setting bridge allowance...");
        const approveTx = await tokenContract.approve(BRIDGE_CONFIG.bridgeAddress, bridgeAmount, {
          gasLimit: 100000
        });
        await approveTx.wait();
      }

      const initialTokenBalance = await tokenContract.balanceOf(walletAddress);
      const tx = await bridgeContract.bridgeAsset(
        destNetworkId,
        destAddress,
        bridgeAmount,
        tokenAddress,
        true,
        "0x",
        {
          gasLimit: 400000
        }
      );

      const receipt = await tx.wait();

      const finalTokenBalance = await tokenContract.balanceOf(walletAddress);
      const actualBridgedAmount = initialTokenBalance.sub(finalTokenBalance);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            bridge: {
              fromNetwork: "TATARA",
              toNetwork: destinationNetwork,
              fromAddress: walletAddress,
              toAddress: destAddress,
              token: {
                address: tokenAddress,
                symbol: tokenSymbol,
                amount: formatBalance(actualBridgedAmount, tokenDecimals)
              }
            },
            balanceChanges: {
              tokenBalance: {
                before: formatBalance(initialTokenBalance, tokenDecimals),
                after: formatBalance(finalTokenBalance, tokenDecimals),
                change: formatBalance(actualBridgedAmount.mul(-1), tokenDecimals)
              }
            },
            bridgeInfo: {
              bridgeAddress: BRIDGE_CONFIG.bridgeAddress,
              destinationNetworkId: destNetworkId,
              note: "Tokens will be available on destination network after bridge confirmation"
            },
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
            message: `Failed to bridge tokens: ${error.message}`,
            tokenAddress,
            amount,
            destinationNetwork
          }, null, 2)
        }]
      };
    }
  }
);

//server configurations
async function startServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Tatara MCP server started successfully");
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

startServer();