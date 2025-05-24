import React, { useState, useEffect, useCallback } from 'react';
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

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTokenForModal, setSelectedTokenForModal] = useState(null);
  const [isTestDataMode, setIsTestDataMode] = useState(true); // Default to test data mode
  const [blockchainTokens, setBlockchainTokens] = useState([]);
  const [provider, setProvider] = useState(null); // Store provider for reuse

  // Mock function to simulate fetching token data from blockchain
  const fetchBlockchainTokenData = useCallback(async (walletProvider, userAddress) => {
    if (!walletProvider || !userAddress) {
      setBlockchainTokens([]); // Clear tokens if no provider or address
      return;
    }
    setError(''); // Clear previous errors related to fetching
    console.log("Fetching blockchain token data for address:", userAddress);
    // Placeholder for actual blockchain fetching logic
    // You would use walletProvider to interact with smart contracts or query balances
    // For each token, you'd need its contract address and ABI (for ERC20 tokens)

    // Example: Fetching ETH balance is already done in connectWallet,
    // but you might want to represent ETH as a token in this list too.

    // Mock data for demonstration, including a unique 'address' for each token contract
    const fetchedTokens = [
      {
        id: 'bc_eth',
        name: 'Ether (Real)',
        symbol: 'ETH',
        quantity: balance, // Assuming balance is already fetched ETH balance for the connected wallet
        apr: '4.2%',
        suggestions: ['Lido Staking (Real)', 'Rocket Pool Staking (Real)'],
        address: '0x0000000000000000000000000000000000000000', // Special address for native ETH
        isNative: true, // Flag for native token
      },
      {
        id: 'bc_stk',
        name: 'StakeToken (Real)',
        symbol: 'STK',
        quantity: '0', // Placeholder, fetch actual balance
        apr: '7.5%',
        suggestions: ['Native Staking Pool (Real)'],
        address: '0xYOUR_STAKETOKEN_CONTRACT_ADDRESS_HERE', // Replace with actual contract address
      },
      // Add more token fetching logic here
      // e.g., const tokenContract = new Contract(TOKEN_ADDRESS, TOKEN_ABI, walletProvider.getSigner());
      // const userTokenBalance = await tokenContract.balanceOf(userAddress);
      // const tokenName = await tokenContract.name();
      // const tokenSymbol = await tokenContract.symbol();
    ];

    // Simulate fetching balances for ERC20 tokens (replace with actual calls)
    const updatedFetchedTokens = await Promise.all(fetchedTokens.map(async token => {
      if (token.isNative) return token; // ETH balance is already available via `balance` state
      try {
        // Placeholder: Replace with actual balance fetching logic using token.address
        // const signer = await walletProvider.getSigner();
        // const contract = new Contract(token.address, ERC20_ABI, signer);
        // const bal = await contract.balanceOf(userAddress);
        // const decimals = await contract.decimals(); // You'll need decimals for correct formatting
        // return { ...token, quantity: formatUnits(bal, decimals) };
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        return { ...token, quantity: (Math.random() * 1000).toFixed(2) }; // Mock quantity
      } catch (fetchErr) {
        console.error(`Error fetching balance for ${token.symbol}:`, fetchErr);
        setError(prev => prev + `\nError fetching ${token.symbol}.`);
        return { ...token, quantity: 'Error' };
      }
    }));

    setBlockchainTokens(updatedFetchedTokens);
  }, [balance]); // Add balance as dependency, as it's used for ETH quantity

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
        fetchBlockchainTokenData(browserProvider, userAddress);
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
    // Optionally, you could switch back to test data mode here if desired
    // setIsTestDataMode(true);
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
      />
      <main className="App-content">
        <TokenTable
          tokens={isTestDataMode ? mockTokens : blockchainTokens}
          onOpenSuggestions={handleOpenSuggestionsModal}
          isLoading={!isTestDataMode && blockchainTokens.length === 0 && !!walletAddress && !error} // Show loading if in real mode, no tokens yet, wallet connected, and no general error
        />
      </main>
      {error && !isModalOpen && <p className="error-message">{error}</p>} {/* Hide app error if modal is open for better UX */}
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
