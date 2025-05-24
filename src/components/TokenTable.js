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

            // Find the best matching rate for icon/link (prefer direct match, fallback to any rate)
            let bestRate = null;
            if (token.rates && token.rates.length > 0) {
              bestRate = token.rates[0];
            } else if (token.symbol) {
              // fallback: search all rates for input_symbol match
              if (tokens.rates && Array.isArray(tokens.rates)) {
                bestRate = tokens.rates.find(r => (r.input_symbol || '').toUpperCase() === token.symbol.toUpperCase());
              }
            }

            // Use from_icon and project_link from bestRate if available
            const iconUrl = bestRate && bestRate.from_icon ? bestRate.from_icon : null;
            const projectLink = bestRate && bestRate.project_link ? bestRate.project_link : null;

            // Click handler for token cell
            const handleTokenClick = (e) => {
              if (projectLink) {
                window.open(projectLink, '_blank', 'noopener,noreferrer');
                e.stopPropagation();
              }
            };

            return (
              <tr
                key={token.id}
                className={isHighlighted ? 'highlighted-token-row' : ''}
              >
                <td
                  data-label="Token"
                  style={{ cursor: projectLink ? 'pointer' : undefined, display: 'flex', alignItems: 'center', gap: '0.5em' }}
                  onClick={handleTokenClick}
                  title={projectLink ? `Go to ${projectLink}` : undefined}
                >
                  {iconUrl && (
                    <img
                      src={iconUrl}
                      alt={token.symbol + " icon"}
                      style={{ width: 22, height: 22, verticalAlign: 'middle', marginRight: 6, borderRadius: '50%', background: '#fff' }}
                      loading="lazy"
                    />
                  )}
                  <span>
                    {token.name} ({token.symbol})
                  </span>
                </td>
                <td data-label="Quantity">{token.quantity}</td>
                <td data-label="Current APY">{token.apr || 'N/A'}</td>
                <td data-label="Max APY">{token.maxApr || 'N/A'}</td>
                <td data-label="Action">
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
