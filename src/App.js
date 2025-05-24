import React, { useState } from 'react';
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

  const connectWallet = async () => {
    setError(''); // Clear previous errors
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install it from metamask.io');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const balanceInWei = await provider.getBalance(signer.address);
      const balanceInEth = formatEther(balanceInWei);
      setBalance(balanceInEth);
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

  return (
    <div className="App">
      <Header
        walletAddress={walletAddress}
        balance={balance}
        error={error}
        connectWallet={connectWallet}
        setError={setError}
      />
      <main className="App-content">
        <TokenTable tokens={mockTokens} onOpenSuggestions={handleOpenSuggestionsModal} />
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
