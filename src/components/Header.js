import React from 'react';
import './Header.css';

function Header({
  walletAddress,
  connectWallet,
  disconnectWallet,
  setError,
  isTestDataMode,
  toggleTestDataMode,
  networks,
  currentNetworkId,
  handleNetworkChange
}) {
  const handleConnectWallet = async () => {
    setError(''); // Clear error before attempting to connect
    await connectWallet();
  };

  return (
    <header className="App-header">
      <div className="logo">MyLogo</div>
      <div className="header-spacer"></div>
      <div className="header-actions">
        <div className="toggle-switch-container">
          <span className="toggle-label">{isTestDataMode ? 'Test Data Mode' : 'Real Data Mode'}</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isTestDataMode}
              onChange={toggleTestDataMode}
            />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="network-selector">
          <select
            value={currentNetworkId || ''}
            onChange={(e) => handleNetworkChange(e.target.value)}
            disabled={!currentNetworkId && !!walletAddress} // Disable if on unsupported network but wallet connected
          >
            {currentNetworkId === null && !Object.values(networks).find(n => n.id === currentNetworkId) && (
              // Option for when current network in MM is not in our list
              <option value="" disabled>Unsupported Network</option>
            )}
            {Object.values(networks).map((network) => (
              <option key={network.id} value={network.id}>
                {network.name}
              </option>
            ))}
          </select>
        </div>
        {!walletAddress ? (
          <button onClick={handleConnectWallet} className="connect-wallet-button">
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info" onClick={disconnectWallet} title="Click to disconnect wallet">
            <span>{`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}</span>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
