import React from 'react';
import './TokenTable.css';

function TokenTable({ tokens, onOpenSuggestions, isLoading, highlightedSymbols = [] }) {
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

  // Normalize highlightedSymbols to uppercase for comparison
  const highlightSet = new Set((highlightedSymbols || []).map(s => (s || '').toUpperCase()));

  return (
    <div className="token-table-container">
      <h2>Your Token Holdings</h2>
      <table className="token-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Quantity</th>
            <th>Current APY</th>
            <th>Max APY</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => {
            const isHighlighted = token.symbol && highlightSet.has(token.symbol.toUpperCase());
            return (
              <tr
                key={token.id}
                className={isHighlighted ? 'highlighted-token-row' : ''}
              >
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TokenTable;
