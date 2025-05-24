import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import './App.css';
import Header from './components/Header';
import TokenTable from './components/TokenTable'; // Renamed from TokenList
import Modal from './components/Modal'; // New Modal component

// Mock data for tokens - in a real app, this would come from an API or wallet
const mockTokens = [
  { id: '1', name: 'Ether', symbol: 'ETH', quantity: '2.5', apr: '4.5%', suggestions: ['Lido Staking', 'Rocket Pool Staking', 'EigenLayer Restaking'] },
  { id: '2', name: 'CoolToken', symbol: 'CTK', quantity: '1500', apr: '8.0%', suggestions: ['Native Staking Pool A', 'Yield Farm X', 'Lend on Protocol Y'] },
  { id: '3', name: 'StableCoin', symbol: 'USDC', quantity: '500', apr: null, suggestions: ['Aave Lending', 'Compound Lending', 'Curve Pool'] },
  { id: '4', name: 'AnotherCoin', symbol: 'ANC', quantity: '250', apr: '6.2%', suggestions: ['Binance Earn', 'Kraken Staking'] },
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
    // For APR, use direct match (first rate)
    let apr = token.apr;
    if (matchingRates.length > 0) {
      const maxDirectApy = Math.max(...matchingRates.map(r => r.apy || 0));
      apr = (maxDirectApy ? maxDirectApy.toFixed(2) + '%' : token.apr);
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


  // Fetch rates from /rates endpoint
  const fetchRates = useCallback(async () => {
    try {
      const resp = await fetch('/rates');
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
        apr: '4.2%',
        suggestions: ['Lido Staking (Real)', 'Rocket Pool Staking (Real)'],
        address: '0x0000000000000000000000000000000000000000', // Native ETH
        isNative: true,
      },
      {
        id: 'bc_wsteth',
        name: 'Wrapped stETH',
        symbol: 'wstETH',
        quantity: '0',
        apr: '5.0%',
        suggestions: ['Lido Wrap', 'Restake via EigenLayer'],
        address: '0x6b8116B41bFd7e1A976cB892acB79926080A6Ca1',
      },
      {
        id: 'bc_usdt',
        name: 'Tether USD',
        symbol: 'USDT',
        quantity: '0',
        apr: '3.5%',
        suggestions: ['Lend on Aave', 'Provide liquidity on Curve'],
        address: '0xF2147b998141887Be7FA7834CCCD135e0067321a',
      },
      {
        id: 'bc_wbtc',
        name: 'Wrapped Bitcoin',
        symbol: 'WBTC',
        quantity: '0',
        apr: '2.8%',
        suggestions: ['Stake on RenVM', 'Lend on Compound'],
        address: '0x29d1abD6A9d1d6961394dE0dBb85b4e89eC0E3f4',
      },
      {
        id: 'bc_dai',
        name: 'DAI Stablecoin',
        symbol: 'DAI',
        quantity: '0',
        apr: '4.1%',
        suggestions: ['Lend on Aave', 'Farm on Curve'],
        address: '0xc4A8b48b1dB6584FB446Fc3BaE230dD3EF3C85DB',
      }
    ];

    // Simulate fetching balances for ERC20 tokens (replace with actual calls)
    const updatedFetchedTokens = await Promise.all(fetchedTokens.map(async token => {
      if (token.isNative) return token; // ETH balance is already available via `balance` state
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        return { ...token, quantity: (Math.random() * 1000).toFixed(2) }; // Mock quantity
      } catch (fetchErr) {
        console.error(`Error fetching balance for ${token.symbol}:`, fetchErr);
        setError(prev => prev + `\nError fetching ${token.symbol}.`);
        return { ...token, quantity: 'Error' };
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

  const handleOpenSuggestionsModal = (token) => {
    setSelectedTokenForModal(token);
    setIsModalOpen(true);
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
        />
      )}
    </div>
  );
}

export default App;
