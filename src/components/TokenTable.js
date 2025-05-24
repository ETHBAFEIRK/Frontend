import React from 'react';
import './TokenTable.css';

function TokenTable({tokens, onOpenSuggestions, isLoading, highlightedSymbols = [], walletAddress}) {
    // Set this to false to hide coins without icons
    const showWithoutIcons = false;

    // If wallet is not connected, show "please connect wallet" and hide the table
    if (!walletAddress) {
        return (
            <div className="token-table-container">
                <p style={{textAlign: "center", fontSize: "1.25rem", fontWeight: 600, margin: "2.5rem 0"}}>Please connect wallet</p>
            </div>
        );
    }

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

    // Token icons map (should match backend and graph_tokens.py)
    const tokenIcons = {
        "eth":      "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/eth-logo.9c7e160a.svg",
        "weth":     "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/eth-logo.9c7e160a.svg:",
        "steth":    "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/wsteth-logo.70d80504.svg",
        "wsteth":   "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/wsteth-logo.70d80504.svg",
        "ezeth":    "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/ezeth-logo.6809574f.svg",
        "pzeth":    "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/pzeth-logo.c24e47cd.svg",
        "stone":    "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/stone-logo.ee085a0a.svg",
        "xpufeth":  "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/xpufeth-logo.1bfb3c5a.svg",
        "msteth":   "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/msteth-logo.70d80504.svg",
        "weeth":    "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/weeth-logo.209d6604.svg",
        "egeth":    "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/egeth-logo.bd7e9357.svg",
        "inwsteth": "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/inwsteths-logo.2406ea8b.svg",
        "rseth":    "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/rseth-logo.948cf45f.svg",
        "lseth":    "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/lseth-logo.6dab9ca0.svg",
        "usdc":     "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/usdc-logo.ffc33eac.svg",
        "usdt":     "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/usdt-logo.b1f7c50b.svg",
        "usde":     "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/usde-logo.c17debe1.svg",
        "fbtc":     "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/fbtc-logo.51f2d301.svg",
        "lbtc":     "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/lbtc-logo.fd05641f.svg",
        "mbtc":     "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/mbtc-logo.3e52220b.svg",
        "pumpbtc":  "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/pumpbtc-logo.af55710d.svg",
        "msweth":   "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/msweth-logo.e4de1bfd.svg",
        "mwbeth":   "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/mwbeth-logo.857f1a84.svg",
        "meth":     "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/meth-logo.2d380f4a.svg",
        "rsteth":   "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/rsteth-logo.9cef011b.svg",
        "steaklrt": "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/steaklrt-logo.9cef011b.svg",
        "re7lrt":   "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/re7lrt-logo.9cef011b.svg",
        "amphreth": "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/amphreth-logo.9cef011b.svg",
        "rsweth":   "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/rsweth-logo.996367c4.svg",
        "sweth":    "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/sweth-logo.037fa270.svg",
        "weeths":   "https://static.zircuit.com/stake/app-dbbe0da3d/_next/static/media/weeths-logo.70e83562.svg",
    };

    // Optionally filter tokens to only those with icons (case-insensitive)
    const filteredTokens = showWithoutIcons
        ? tokens
        : tokens.filter(token => tokenIcons.hasOwnProperty((token.symbol || '').toLowerCase()));

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
                {filteredTokens.map((token) => {
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

                    // Use from_icon and project_link from bestRate if available, else use our tokenIcons map
                    let iconUrl = bestRate && bestRate.from_icon ? bestRate.from_icon : null;
                    if (!iconUrl && token.symbol) {
                        const iconKey = (token.symbol || '').toLowerCase();
                        if (tokenIcons.hasOwnProperty(iconKey)) {
                            iconUrl = tokenIcons[iconKey];
                        }
                    }
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
                                style={{cursor: projectLink ? 'pointer' : undefined, display: 'flex', alignItems: 'center', gap: '0.5em'}}
                                onClick={handleTokenClick}
                                title={projectLink ? `Go to ${projectLink}` : undefined}
                            >
                                {iconUrl && (
                                    <img
                                        src={iconUrl}
                                        alt={token.symbol + " icon"}
                                        style={{width: 22, height: 22, verticalAlign: 'middle', marginRight: 6, borderRadius: '50%', background: '#fff'}}
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
                            <td data-label="Action" style={{verticalAlign: 'middle', textAlign: 'center', padding: '0.3rem 0.5rem'}}>
                                {(() => {
                                    // Parse APY values as floats, fallback to NaN if not present
                                    const parseApy = (val) => {
                                        if (!val) return NaN;
                                        if (typeof val === "number") return val;
                                        if (typeof val === "string") {
                                            // Remove % and whitespace
                                            return parseFloat(val.replace('%', '').trim());
                                        }
                                        return NaN;
                                    };
                                    const currentApy = parseApy(token.apr);
                                    const maxApy = parseApy(token.maxApr);

                                    // Show "Optimal" if maxApy < currentApy or maxApy is not a number
                                    // Also show "Optimal" if maxApy == currentApy and both are known
                                    if (
                                        isNaN(maxApy) ||
                                        (!isNaN(currentApy) && maxApy < currentApy) ||
                                        (!isNaN(currentApy) && !isNaN(maxApy) && Math.abs(currentApy - maxApy) < 1e-6)
                                    ) {
                                        return (
                                            <span
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    background: "#e6f0f7",
                                                    color: "#3b82f6",
                                                    borderRadius: "18px",
                                                    fontWeight: 700,
                                                    fontSize: "1.01rem",
                                                    minWidth: "110px",
                                                    minHeight: "38px",
                                                    textAlign: "center",
                                                    padding: "0 1.1rem",
                                                    boxSizing: "border-box",
                                                    boxShadow: "0 1px 4px 0 rgba(58, 130, 246, 0.08)",
                                                }}
                                            >
                          Optimal
                        </span>
                                        );
                                    }
                                    // Otherwise, show "Do it!" button
                                    // If quantity is 0, show "show me" instead of "Do it!"
                                    const qty = parseFloat(token.quantity);
                                    const showMeLabel = (qty === 0 || isNaN(qty)) ? "Show!" : "Do it!";
                                    return (
                                        <button
                                            onClick={(e) => {
                                                if (!(e && (e.altKey || e.metaKey))) {
                                                    // Show mermaid modal for full graph, pass quantity for dialog
                                                    window.dispatchEvent(new CustomEvent('show-mermaid-graph', {detail: {token: {...token}}}));
                                                } else {
                                                    onOpenSuggestions(token, e);
                                                }
                                            }}
                                            className="suggestions-button"
                                        >
                                            {showMeLabel}
                                        </button>
                                    );
                                })()}
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
