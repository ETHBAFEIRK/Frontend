import React from 'react';
import './TokenList.css';

function TokenList() {
  return (
    <div className="token-list-container">
      <h2>Your Tokens</h2>
      <p>Token list and APR will be displayed here.</p>
      {/* Placeholder for token items */}
      <div className="token-item-placeholder">
        <p>Token A - APR: X%</p>
        <p>Token B - APR: Y%</p>
      </div>
    </div>
  );
}

export default TokenList;
