import React from 'react';
import './Header.css';

function Header({ walletAddress, balance, connectWallet, setError }) {
  const handleConnectWallet = async () => {
    setError(''); // Clear error before attempting to connect
    await connectWallet();
  };

  return (
    <header className="App-header">
      <div className="logo">MyLogo</div>
      <div className="header-spacer"></div>
      <div className="header-actions">
        <div className="network-selector">
          {/* Placeholder for network selector */}
          <span>Ethereum Mainnet</span>
        </div>
        {!walletAddress ? (
          <button onClick={handleConnectWallet} className="connect-wallet-button">
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <p>Address: {`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}</p>
            <p>Balance: {balance ? parseFloat(balance).toFixed(4) : '0.0000'} ETH</p>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
