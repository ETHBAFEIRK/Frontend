const { ethers } = require("ethers");

// Replace with your Ethereum provider (e.g., Infura, Alchemy)
const provider = new ethers.JsonRpcProvider("https://zircuit-testnet.drpc.org");

// Replace with the wallet address you want to inspect
const walletAddress = "0xC8dafB08f54940E0A7D1CC857B39fa06F2f4E79B"; // hardcoded address for testing

// Minimal ERC-20 ABI
const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

// Token contract addresses on Ethereum mainnet
const TOKENS = {
    wstETH:   "0x6b8116B41bFd7e1A976cB892acB79926080A6Ca1",
    USDT: "0xF2147b998141887Be7FA7834CCCD135e0067321a",
    WBTC: "0x29d1abD6A9d1d6961394dE0dBb85b4e89eC0E3f4",
    DAI: "0xc4A8b48b1dB6584FB446Fc3BaE230dD3EF3C85DB"
};

export async function getBalances(walletAddress) {
    const balances = [];
  
    // Get ETH balance
    const ethBalance = await provider.getBalance(walletAddress);
    balances.push({ symbol: "ETH", balance: ethers.formatEther(ethBalance) });
  
    // Get ERC20 balances
    for (const [name, address] of Object.entries(TOKENS)) {
      try {
        const contract = new ethers.Contract(address, ERC20_ABI, provider);
        const [rawBalance, decimals, symbol] = await Promise.all([
          contract.balanceOf(walletAddress),
          contract.decimals(),
          contract.symbol()
        ]);
        balances.push({
          symbol: symbol || name,
          balance: ethers.formatUnits(rawBalance, decimals)
        });
      } catch (error) {
        balances.push({ symbol: name, balance: "Error" });
      }
    }
  
    return balances;
  }