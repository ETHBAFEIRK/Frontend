import React, { useState } from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import './App.css';
import Header from './components/Header';
import TokenList from './components/TokenList';
import RestakedTokenList from './components/RestakedTokenList';

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');

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
        <TokenList />
        <RestakedTokenList />
      </main>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default App;
