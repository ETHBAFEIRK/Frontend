import React from 'react';
import './RestakedTokenList.css';

function RestakedTokenList() {
  return (
    <div className="restaked-token-list-container">
      <h2>Your Restaked Tokens</h2>
      <p>Restaked token list and APR will be displayed here.</p>
      {/* Placeholder for restaked token items */}
      <div className="token-item-placeholder">
        <p>Restaked Token X - APR: A%</p>
        <p>Restaked Token Y - APR: B%</p>
      </div>
    </div>
  );
}

export default RestakedTokenList;
