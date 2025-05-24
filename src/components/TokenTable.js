import React from 'react';
import './TokenTable.css';

function TokenTable({ tokens, onOpenSuggestions, isLoading }) {
  if (isLoading) {
    return (
      <div className="token-table-container">
        <h2>Your Token Holdings</h2>
        <p>Loading token data from blockchain...</p>
      </div>
    );
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="token-table-container">
        <h2>Your Token Holdings</h2>
        <p>No tokens to display. Connect your wallet or switch to Test Data Mode to see mock tokens.</p>
      </div>
    );
  }

  return (
    <div className="token-table-container">
      <h2>Your Token Holdings</h2>
      <table className="token-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Quantity</th>
            <th>Current APR</th>
            <th>Max APR</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.id}>
              <td>{token.name} ({token.symbol})</td>
              <td>{token.quantity}</td>
              <td>{token.apr || 'N/A'}</td>
              <td>{token.maxApr || 'N/A'}</td>
              <td>
                <button
                  onClick={() => onOpenSuggestions(token)}
                  className="suggestions-button"
                >
                  How to do it?
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TokenTable;
