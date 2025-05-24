import React, { useState } from 'react';
import { BrowserProvider, formatEther } from 'ethers';

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');

  const connectWallet = async () => {
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
      setError('Error connecting to MetaMask');
      console.error(err);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>ETH Wallet Checker</h1>
      {!walletAddress ? (
        <button onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <div>
          <p>Wallet Address: {walletAddress}</p>
          <p>ETH Balance: {balance}</p>
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default App;
