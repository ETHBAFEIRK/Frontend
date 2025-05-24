import React from 'react';
import './Modal.css';

function Modal({ isOpen, onClose, token }) {
  if (!isOpen || !token) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          &times;
        </button>
        <h2>Restaking Suggestions for {token.name} ({token.symbol})</h2>
        <div className="suggestions-list">
          {token.suggestions && token.suggestions.length > 0 ? (
            <ul>
              {token.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          ) : (
            <p>No specific suggestions available for this token.</p>
          )}
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="action-button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
