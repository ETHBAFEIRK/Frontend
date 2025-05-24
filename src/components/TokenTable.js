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
              <td style={{ display: 'flex', gap: '0.5em', alignItems: 'center' }}>
                <button
                  onClick={() => onOpenSuggestions(token)}
                  className="suggestions-button"
                >
                  How to do it?
                </button>
                <button
                  style={{
                    fontSize: '0.75em',
                    padding: '2px 8px',
                    marginLeft: '4px',
                    borderRadius: '4px',
                    border: '1px solid #888',
                    background: '#f5f5f5',
                    cursor: 'pointer'
                  }}
                  title="Compute best rates"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const resp = await fetch('http://localhost:3000/rates');
                      if (!resp.ok) throw new Error('Failed to fetch rates');
                      const data = await resp.json();
                      console.log('Rates:', data);
                    } catch (err) {
                      console.error('Error fetching rates:', err);
                    }
                  }}
                >
                  Compute
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
