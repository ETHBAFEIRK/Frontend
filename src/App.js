import React, { useState, useEffect, useCallback, useRef } from 'react';
import MermaidGraphModal from './components/MermaidGraphModal';
import { BrowserProvider, formatEther, Contract, formatUnits } from 'ethers';
import './App.css';
import Header from './components/Header';
import TokenTable from './components/TokenTable'; // Renamed from TokenList
import Modal from './components/Modal'; // New Modal component

// Mock data for tokens - in a real app, this would come from an API or wallet
const mockTokens = [
  { id: '1', name: 'Ether', symbol: 'ETH', quantity: '2.5', suggestions: ['Lido Staking', 'Rocket Pool Staking', 'EigenLayer Restaking'] },
  { id: '5', name: 'DAI Stablecoin', symbol: 'DAI', quantity: '0', suggestions: ['Aave Lending', 'MakerDAO Vault'] },
  { id: '6', name: 'ETHx', symbol: 'ETHx', quantity: '0', suggestions: ['Restake via KelpDAO'] },
  { id: '7', name: 'ezETH', symbol: 'EZETH', quantity: '0', suggestions: ['Stake via Renzo'] },
  { id: '8', name: 'gmETH', symbol: 'GMETH', quantity: '0', suggestions: ['Bridge to GM Network'] },
  { id: '9', name: 'inwstETH', symbol: 'INWSTETH', quantity: '0', suggestions: ['Restake via Inception'] },
  { id: '10', name: 'mstETH', symbol: 'MSTETH', quantity: '0', suggestions: ['Stake via Eigenpie'] },
  { id: '11', name: 'pzETH', symbol: 'PZETH', quantity: '0', suggestions: ['Stake via Renzo'] },
  { id: '12', name: 'rsETH', symbol: 'RSETH', quantity: '0', suggestions: ['Restake via KelpDAO'] },
  { id: '13', name: 'Stakestone', symbol: 'STONE', quantity: '0', suggestions: ['Stake via Stakestone'] },
  { id: '14', name: 'stETH', symbol: 'STETH', quantity: '0', suggestions: ['Stake via Lido'] },
  { id: '15', name: 'USD Coin (Bridged)', symbol: 'USDC.e', quantity: '0', suggestions: ['Aave Lending', 'DEX Swap'] },
  { id: '16', name: 'Tether USD', symbol: 'USDT', quantity: '0', suggestions: ['Aave Lending', 'Stable Pool'] },
  { id: '17', name: 'Wrapped BTC (Bridged)', symbol: 'WBTC.e', quantity: '0', suggestions: ['Curve BTC Pool'] },
  { id: '18', name: 'Wrapped ETH', symbol: 'WETH', quantity: '0', suggestions: ['Uniswap LP', 'Restake'] },
  { id: '19', name: 'Wrapped stETH', symbol: 'WSTETH', quantity: '0', suggestions: ['Restake via EigenLayer'] },
  { id: '20', name: 'weETH', symbol: 'WEETH', quantity: '0', suggestions: ['Restake'] },
  { id: '21', name: 'weETHs', symbol: 'WEETHS', quantity: '0', suggestions: ['Restake'] },
  { id: '22', name: 'wetETH', symbol: 'WETETH', quantity: '0', suggestions: ['Restake'] },
  { id: '23', name: 'xPufETH', symbol: 'XPUFETH', quantity: '0', suggestions: ['Restake via Puffer'] },
  { id: '24', name: 'Zircuit Token', symbol: 'ZRC', quantity: '0', suggestions: ['Bridge or Swap'] },
];

const NETWORKS = {
  sepolia: {
    id: 'sepolia',
    chainId: '0xaa36a7', // 11155111 в hex
    name: 'Ethereum Sepolia Testnet',
    currencyName: 'Sepolia ETH',
    currencySymbol: 'SepoliaETH',
    currencyDecimals: 18,
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },
  zircuit: {
    id: 'zircuit',
    chainId: '0xbf03',
    name: 'Zircuit Garfield Testnet',
    currencyName: 'Ether',
    currencySymbol: 'ETH',
    currencyDecimals: 18,
    rpcUrls: ['https://rpc.zircuit.com'],
    blockExplorerUrls: ['https://explorer.zircuit.com']
  }
};

function reconcileTokensWithRates(tokens, rates) {
  // Build a directed graph from rates: input_symbol -> output_token with edge weight = apy
  if (!Array.isArray(tokens) || !Array.isArray(rates)) return tokens;

  // Build adjacency list: {symbol: [{to, apy, rateObj}]}
  const adj = {};
  rates.forEach(rate => {
    const from = (rate.input_symbol || '').toUpperCase();
    const to = (rate.output_token || '').toUpperCase();
    if (!from || !to) return;
    if (!adj[from]) adj[from] = [];
    adj[from].push({ to, apy: rate.apy, rateObj: rate });
  });

  // For each token, find the reachable token with max APY using BFS
  function findMaxApyPath(startSymbol) {
    const visited = new Set();
    let maxApy = null;
    let maxRate = null;
    let queue = [{ symbol: startSymbol, minApy: null, path: [] }];

    while (queue.length > 0) {
      const { symbol, minApy, path } = queue.shift();
      if (visited.has(symbol)) continue;
      visited.add(symbol);

      if (adj[symbol]) {
        for (const edge of adj[symbol]) {
          const nextApy = edge.apy;
          // If this path has a higher APY, update
          if (maxApy === null || nextApy > maxApy) {
            maxApy = nextApy;
            maxRate = edge.rateObj;
          }
          // Continue BFS
          if (!visited.has(edge.to)) {
            queue.push({ symbol: edge.to, minApy: null, path: [...path, edge.to] });
          }
        }
      }
    }
    return { maxApy, maxRate };
  }

  // Map rates by input_symbol for direct matches (for apr column)
  const ratesBySymbol = {};
  rates.forEach(rate => {
    const symbol = (rate.input_symbol || '').toUpperCase();
    if (!ratesBySymbol[symbol]) ratesBySymbol[symbol] = [];
    ratesBySymbol[symbol].push(rate);
  });

  return tokens.map(token => {
    const symbol = (token.symbol || '').toUpperCase();
    const matchingRates = ratesBySymbol[symbol] || [];
    
    let apr = 'N/A'; // Default Current APY to 'N/A'
    if (matchingRates.length > 0) {
      // Filter out rates without a valid 'apy' or where 'apy' is not a number
      const validApys = matchingRates.map(r => r.apy).filter(apy => typeof apy === 'number' && !isNaN(apy));
      if (validApys.length > 0) {
        const maxDirectApy = Math.max(...validApys);
        apr = maxDirectApy.toFixed(2) + '%';
      }
    }

    // For MAX APR, use best reachable via graph
    const { maxApy } = findMaxApyPath(symbol);
    let maxApr = token.maxApr;
    if (maxApy !== null && maxApy !== undefined) {
      maxApr = maxApy.toFixed(2) + '%';
    }
    return {
      ...token,
      maxApr,
      apr,
      rates: matchingRates
    };
  });
}

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTokenForModal, setSelectedTokenForModal] = useState(null);
  const [isTestDataMode, setIsTestDataMode] = useState(true); // Default to test data mode
  const [blockchainTokens, setBlockchainTokens] = useState([]);
  const [provider, setProvider] = useState(null); // Store provider for reuse
  const [highlightedSymbols, setHighlightedSymbols] = useState([]); // For Compute highlighting
  const [rates, setRates] = useState([]);
  const [reconciledTokens, setReconciledTokens] = useState([]);
  const ratesFetchedRef = useRef(false);
  const INITIAL_NETWORK_ID = 'ethereum';
  const [currentNetworkId, setCurrentNetworkId] = useState(INITIAL_NETWORK_ID);
  const selectedNetwork = NETWORKS[currentNetworkId] || null;

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)" // Added name for completeness
];

  // Fetch rates from /rates endpoint
  const fetchRates = useCallback(async () => {
    try {
      const resp = await fetch('/api/rates');
      if (!resp.ok) throw new Error('Failed to fetch rates');
      const data = await resp.json();
      setRates(data);
      ratesFetchedRef.current = true;
      return data;
    } catch (err) {
      setError('Error fetching rates: ' + err.message);
      setRates([]);
      ratesFetchedRef.current = false;
      return [];
    }
  }, []);

  // Mock function to simulate fetching token data from blockchain
  const fetchBlockchainTokenData = useCallback(async (walletProvider, userAddress) => {
    if (!walletProvider || !userAddress) {
      setBlockchainTokens([]); // Clear tokens if no provider or address
      return [];
    }
    setError(''); // Clear previous errors related to fetching
    console.log("Fetching blockchain token data for address:", userAddress);

    const fetchedTokens = [
      {
        id: 'bc_eth',
        name: 'Ether (Real)',
        symbol: 'ETH',
        quantity: balance, // Already fetched ETH balance
        // apr removed, will be sourced from backend
        suggestions: ['Lido Staking (Real)', 'Rocket Pool Staking (Real)'],
        address: '0x0000000000000000000000000000000000000000', // Native ETH
        isNative: true,
      },
      {
        id: 'bc_wsteth',
        name: 'Wrapped stETH',
        symbol: 'wstETH',
        quantity: '0',
        // apr removed, will be sourced from backend
        suggestions: ['Lido Wrap', 'Restake via EigenLayer'],
        address: '0x6b8116B41bFd7e1A976cB892acB79926080A6Ca1',
      },
      {
        id: 'bc_usdt',
        name: 'Tether USD',
        symbol: 'USDT',
        quantity: '0',
        // apr removed, will be sourced from backend
        suggestions: ['Lend on Aave', 'Provide liquidity on Curve'],
        address: '0xF2147b998141887Be7FA7834CCCD135e0067321a',
      },
      {
        id: 'bc_wbtc',
        name: 'Wrapped Bitcoin',
        symbol: 'WBTC',
        quantity: '0',
        // apr removed, will be sourced from backend
        suggestions: ['Stake on RenVM', 'Lend on Compound'],
        address: '0x29d1abD6A9d1d6961394dE0dBb85b4e89eC0E3f4',
      },
      {
        id: 'bc_dai',
        name: 'DAI Stablecoin',
        symbol: 'DAI',
        quantity: '0',
        // apr removed, will be sourced from backend
        suggestions: ['Lend on Aave', 'Farm on Curve'],
        address: '0xc4A8b48b1dB6584FB446Fc3BaE230dD3EF3C85DB',
      }
    ];

    // Fetch balances for ERC20 tokens
    const updatedFetchedTokens = await Promise.all(fetchedTokens.map(async token => {
      if (token.isNative) {
        // Ensure native token quantity is updated if balance state changes
        return { ...token, quantity: balance };
      }
      if (!token.address || token.address === '0x0000000000000000000000000000000000000000') {
        // Skip if address is invalid or placeholder for non-native tokens
        console.warn(`Skipping token ${token.symbol} due to missing or invalid address.`);
        return { ...token, quantity: 'N/A (No address)' };
      }
      try {
        const contract = new Contract(token.address, ERC20_ABI, walletProvider);
        const [rawBalance, decimals, fetchedSymbol, fetchedName] = await Promise.all([
          contract.balanceOf(userAddress),
          contract.decimals(),
          contract.symbol().catch(() => token.symbol), // Fallback to predefined symbol
          contract.name().catch(() => token.name)      // Fallback to predefined name
        ]);
        
        const quantity = formatUnits(rawBalance, Number(decimals)); // Ensure decimals is a number
        return {
          ...token,
          quantity: quantity,
          symbol: fetchedSymbol || token.symbol, // Prefer fetched symbol
          name: fetchedName || token.name,       // Prefer fetched name
        };
      } catch (fetchErr) {
        console.error(`Error fetching data for ${token.symbol} (${token.address}):`, fetchErr);
        setError(prev => prev + `\nError fetching ${token.symbol}.`);
        return { ...token, quantity: 'Error', symbol: token.symbol, name: token.name };
      }
    }));

    setBlockchainTokens(updatedFetchedTokens);
    return updatedFetchedTokens;
  }, [balance]);

  // Fetch rates on startup (once)
  useEffect(() => {
    if (!ratesFetchedRef.current) {
      fetchRates();
    }
  }, [fetchRates]);

  // Reconcile tokens with rates whenever tokens or rates change
  useEffect(() => {
    let tokens = isTestDataMode ? mockTokens : blockchainTokens;
    const reconciled = reconcileTokensWithRates(tokens, rates);
    setReconciledTokens(reconciled);

    // Highlight tokens whose symbol is in rates input_symbol
    const inputSymbols = Array.isArray(rates)
      ? rates.map(item => (item.input_symbol || '').toUpperCase()).filter(Boolean)
      : [];
    const tokenSymbols = tokens.map(token => (token.symbol || '').toUpperCase());
    tokenSymbols.forEach(symbol => {
      const found = inputSymbols.includes(symbol);
      console.log(
        `[Startup/Reconcile] Checking token symbol: "${symbol}" - ${found ? 'FOUND in /rates input_symbol' : 'NOT found in /rates input_symbol'}`
      );
    });
    setHighlightedSymbols(inputSymbols);
  }, [isTestDataMode, blockchainTokens, rates]);

  useEffect(() => {
    const handleChainChanged = async (_chainId) => {
      setError(''); // Clear previous network errors
      const network = Object.values(NETWORKS).find(
        n => n.chainId.toLowerCase() === _chainId.toLowerCase()
      );
      if (network) {
        setCurrentNetworkId(network.id);
        if (walletAddress && window.ethereum) {
          const browserProvider = new BrowserProvider(window.ethereum);
          setProvider(browserProvider);
          try {
            const bal = await browserProvider.getBalance(walletAddress);
            setBalance(formatEther(bal));
            // After getting balance, fetch tokens and reconcile
            const tokens = await fetchBlockchainTokenData(browserProvider, walletAddress);
            // Reconciliation will be triggered by blockchainTokens/rates effect
          } catch (e) {
            console.error("Error refreshing data on chain change:", e);
            setError("Error fetching data for the new network.");
          }
        }
      } else {
        setCurrentNetworkId(null); // Mark as unsupported
        setError(`Connected to an unsupported network (${_chainId}). Please switch to a supported network.`);
        // Clear wallet-specific data as it's for an unknown/unsupported network
        setWalletAddress(null);
        setBalance(null);
        setProvider(null);
        setBlockchainTokens([]);
      }
    };

    if (window.ethereum) {
      // Set initial network based on MetaMask's current chain
      const currentChainId = window.ethereum.chainId;
      if (currentChainId) {
        handleChainChanged(currentChainId);
      }
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [walletAddress, fetchBlockchainTokenData]);

  const handleNetworkChange = async (targetNetworkId) => {
    const targetNetworkConfig = NETWORKS[targetNetworkId];
    if (!window.ethereum || !targetNetworkConfig) {
      setError("Network configuration not found or MetaMask not available.");
      return;
    }

    if (window.ethereum.chainId === targetNetworkConfig.chainId) {
      // Already on the target network, ensure state is correct if it got out of sync
      if (currentNetworkId !== targetNetworkConfig.id) {
         setCurrentNetworkId(targetNetworkConfig.id);
      }
      return; // Already on the correct network
    }

    setError(''); // Clear previous errors
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetNetworkConfig.chainId }],
      });
      // Success: chainChanged event will handle state updates
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: targetNetworkConfig.chainId,
                chainName: targetNetworkConfig.name,
                nativeCurrency: {
                  name: targetNetworkConfig.currencyName,
                  symbol: targetNetworkConfig.currencySymbol,
                  decimals: targetNetworkConfig.currencyDecimals,
                },
                rpcUrls: targetNetworkConfig.rpcUrls,
                blockExplorerUrls: targetNetworkConfig.blockExplorerUrls,
              },
            ],
          });
          // Success: chainChanged event will handle state updates
        } catch (addError) {
          console.error("Failed to add network:", addError);
          setError(`Failed to add network "${targetNetworkConfig.name}". Please try adding it manually to MetaMask.`);
        }
      } else {
        console.error("Failed to switch network:", switchError);
        setError(`Failed to switch network to "${targetNetworkConfig.name}".`);
      }
    }
  };

  const toggleTestDataMode = () => {
    setIsTestDataMode(prevMode => {
      const newMode = !prevMode;
      if (newMode) { // Switched to Test Data Mode
        setBlockchainTokens([]); // Clear blockchain tokens
      } else { // Switched to Real Data Mode
        if (walletAddress && provider) {
          fetchBlockchainTokenData(provider, walletAddress);
        }
      }
      return newMode;
    });
  };

  const connectWallet = async () => {
    setError(''); // Clear previous errors
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install it from metamask.io');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];
      setWalletAddress(userAddress);

      const browserProvider = new BrowserProvider(window.ethereum);
      setProvider(browserProvider); // Store provider

      const signer = await browserProvider.getSigner();
      const balanceInWei = await browserProvider.getBalance(signer.address);
      const balanceInEth = formatEther(balanceInWei);
      setBalance(balanceInEth);

      // If not in test data mode, fetch blockchain tokens after connecting
      if (!isTestDataMode) {
        await fetchBlockchainTokenData(browserProvider, userAddress);
        // Reconciliation will be triggered by blockchainTokens/rates effect
      }
    } catch (err) {
      setError('Error connecting to MetaMask. Please check your wallet and try again.');
      console.error(err);
    }
  };

  const handleOpenSuggestionsModal = (token, e) => {
    setSelectedTokenForModal(token);
    setIsModalOpen(true);
    // If alt/cmd-click, let Modal handle the graph rendering
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTokenForModal(null);
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setBalance(null);
    setProvider(null);
    setBlockchainTokens([]);
    setError(''); // Clear any errors
    // Optionally, reset to initial network or test data mode
    // setCurrentNetworkId(INITIAL_NETWORK_ID); // Or keep current network
    // setIsTestDataMode(true);
  };

  // Handler for Compute button (now just re-highlights, since rates are already fetched)
  const handleComputeRates = async () => {
    // Optionally, could re-fetch rates here if you want to allow refresh
    // For now, just re-highlight and log
    const tokens = isTestDataMode ? mockTokens : blockchainTokens;
    const inputSymbols = Array.isArray(rates)
      ? rates.map(item => (item.input_symbol || '').toUpperCase()).filter(Boolean)
      : [];
    const tokenSymbols = tokens.map(token => (token.symbol || '').toUpperCase());
    tokenSymbols.forEach(symbol => {
      const found = inputSymbols.includes(symbol);
      console.log(
        `[Compute] Checking token symbol: "${symbol}" - ${found ? 'FOUND in /rates input_symbol' : 'NOT found in /rates input_symbol'}`
      );
    });
    setHighlightedSymbols(inputSymbols);
  };

  return (
    <div className="App">
      <Header
        walletAddress={walletAddress}
        // balance prop removed
        error={error}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet} // Pass disconnect function
        setError={setError}
        isTestDataMode={isTestDataMode}
        toggleTestDataMode={toggleTestDataMode}
        networks={NETWORKS}
        currentNetworkId={currentNetworkId}
        handleNetworkChange={handleNetworkChange}
        onComputeRates={handleComputeRates}
      />
      <main className="App-content">
        <TokenTable
          tokens={reconciledTokens}
          onOpenSuggestions={handleOpenSuggestionsModal}
          isLoading={!isTestDataMode && blockchainTokens.length === 0 && !!walletAddress && !error && !!selectedNetwork} // Show loading if in real mode, no tokens yet, wallet connected, no general error, and network is supported
          highlightedSymbols={highlightedSymbols}
          walletAddress={walletAddress}
        />
      </main>
      {error && !isModalOpen && <p className="error-message">{error}</p>} {/* Hide app error if modal is open for better UX */}
      {!selectedNetwork && walletAddress && ( // Show message if connected to an unsupported network
        <p className="error-message">
          The currently selected network in your wallet is not supported by this application.
          Please switch to a supported network using the dropdown in the header.
        </p>
      )}
      {isModalOpen && selectedTokenForModal && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          token={selectedTokenForModal}
          rates={rates}
        />
      )}
      <MermaidGraphModal rates={rates} tokens={reconciledTokens} />
    </div>
  );
}

export default App;
