import React, { useEffect, useRef, useState } from 'react';
import './Modal.css';

// Helper to build a full mermaid graph from rates (like in the python file)
function buildMermaidGraph(rates) {
  if (!Array.isArray(rates)) return '';
  // Set of tokens with icons (copied from python)
  const token_icons = new Set([
    "ETH", "WETH", "stETH", "wstETH", "ezETH", "pzETH", "STONE", "xPufETH", "mstETH", "weETH", "egETH",
    "inwstETH", "rsETH", "LsETH", "USDC", "USDT", "USDe", "FBTC", "LBTC", "mBTC", "pumpBTC", "mswETH",
    "mwBETH", "mETH", "rstETH", "steakLRT", "Re7LRT", "amphrETH", "rswETH", "swETH", "weETHs"
  ]);
  // Build the graph as adjacency list and reverse adjacency for pruning
  const nodes = new Set();
  const edge_map = {};
  const target_apy = {};

  for (const rate of rates) {
    const from_token = rate.input_symbol;
    const to_token = rate.output_token;
    const kind = rate.output_kind || "";
    const apy = rate.apy;
    nodes.add(from_token);
    nodes.add(to_token);
    const key = `${from_token}|${to_token}`;
    if (!edge_map[key]) edge_map[key] = [];
    edge_map[key].push([kind, apy]);
    if (!target_apy[to_token] || apy > target_apy[to_token]) {
      target_apy[to_token] = apy;
    }
  }

  // Build adjacency and reverse adjacency
  const adj = {};
  const rev_adj = {};
  for (const key of Object.keys(edge_map)) {
    const [from_token, to_token] = key.split('|');
    if (!adj[from_token]) adj[from_token] = new Set();
    if (!rev_adj[to_token]) rev_adj[to_token] = new Set();
    adj[from_token].add(to_token);
    rev_adj[to_token].add(from_token);
  }

  // Find all nodes that can reach a token with an icon (reverse BFS)
  const reachable = new Set(token_icons);
  const queue = Array.from(token_icons);
  while (queue.length > 0) {
    const curr = queue.pop();
    for (const prev of (rev_adj[curr] || [])) {
      if (!reachable.has(prev)) {
        reachable.add(prev);
        queue.push(prev);
      }
    }
  }

  // Only keep nodes and edges where the output token is in reachable set and is in token_icons
  const pruned_nodes = new Set();
  const pruned_edges = [];
  for (const key of Object.keys(edge_map)) {
    const [from_token, to_token] = key.split('|');
    if (!reachable.has(to_token)) continue;
    if (!token_icons.has(to_token)) continue;
    pruned_nodes.add(from_token);
    pruned_nodes.add(to_token);
    // Prefer "stake"/"restake" over "swap"
    let preferred = null;
    for (const [kind, apy] of edge_map[key]) {
      if (kind === "stake" || kind === "restake") {
        preferred = kind;
        break;
      }
    }
    let label = preferred ? preferred : (edge_map[key][0][0] || "");
    label = label.replace(/"/g, '\\"');
    pruned_edges.push([from_token, to_token, label]);
  }

  // Only keep nodes that are in pruned_edges
  const mermaid = ["graph TD"];
  for (const node of Array.from(pruned_nodes).sort()) {
    if (target_apy[node]) {
      const apy_val = target_apy[node];
      mermaid.push(`    ${node}["${node} (${apy_val.toFixed(2)}%)"]`);
    } else {
      mermaid.push(`    ${node}["${node}"]`);
    }
  }
  for (const [from_token, to_token, label] of pruned_edges) {
    if (label) {
      mermaid.push(`    ${from_token} -->|${label}| ${to_token}`);
    } else {
      mermaid.push(`    ${from_token} --> ${to_token}`);
    }
  }
  return mermaid.join('\n');
}

function Modal({ isOpen, onClose, token, rates }) {
  const [showGraph, setShowGraph] = useState(false);
  const [graphCode, setGraphCode] = useState('');
  const mermaidRef = useRef(null);
  const [tokenGraphCode, setTokenGraphCode] = useState('');
  const tokenMermaidRef = useRef(null);

  // Helper: Build a graph only for the selected token as input
  function buildTokenMermaidGraph(token, rates) {
    if (!token || !rates || !Array.isArray(rates)) return '';
    // Find all rates where input_symbol matches the token symbol
    const symbol = token.symbol;
    const filteredRates = rates.filter(r => (r.input_symbol || '').toUpperCase() === (symbol || '').toUpperCase());
    if (filteredRates.length === 0) return '';
    // Use the same graph builder, but only with filtered rates
    return buildMermaidGraph(filteredRates);
  }

  // Dynamically load mermaid for the full graph
  useEffect(() => {
    if (showGraph && graphCode && mermaidRef.current) {
      // Use the actual DOM document, not undefined
      const domDocument = mermaidRef.current.ownerDocument || window.document;
      import('mermaid').then((mermaid) => {
        mermaidRef.current.innerHTML = '';
        mermaid.default.initialize({ startOnLoad: false, theme: "dark" });
        // Use the domDocument to create a temporary element for rendering
        const tempDiv = domDocument.createElement('div');
        mermaid.default.render('mermaid-graph', graphCode, (svgCode) => {
          mermaidRef.current.innerHTML = svgCode;
        }, tempDiv);
      });
    }
  }, [showGraph, graphCode]);

  // Always render the token-specific graph if possible
  useEffect(() => {
    if (token && rates && tokenMermaidRef.current) {
      const code = buildTokenMermaidGraph(token, rates);
      setTokenGraphCode(code);
      if (code) {
        const domDocument = tokenMermaidRef.current.ownerDocument || window.document;
        import('mermaid').then((mermaid) => {
          tokenMermaidRef.current.innerHTML = '';
          mermaid.default.initialize({ startOnLoad: false, theme: "dark" });
          const tempDiv = domDocument.createElement('div');
          mermaid.default.render('token-mermaid-graph', code, (svgCode) => {
            tokenMermaidRef.current.innerHTML = svgCode;
          }, tempDiv);
        });
      } else {
        tokenMermaidRef.current.innerHTML = '';
      }
    } else if (tokenMermaidRef.current) {
      tokenMermaidRef.current.innerHTML = '';
      setTokenGraphCode('');
    }
  }, [token, rates]);

  // Reset graph when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowGraph(false);
      setGraphCode('');
    }
  }, [isOpen]);

  if (!isOpen || !token) {
    return null;
  }

  const handleHowToDoItClick = (e) => {
    // Only handle alt-click or meta-click (command on Mac)
    if (e && (e.altKey || e.metaKey)) {
      e.preventDefault();
      if (rates && Array.isArray(rates)) {
        setGraphCode(buildMermaidGraph(rates));
        setShowGraph(true);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
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
        <div className="modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
          <button
            className="action-button"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="action-button"
            style={{ background: '#222', color: '#00ffff', border: '1px solid #00ffff' }}
            onClick={handleHowToDoItClick}
            title="Alt-click or Cmd-click to show the full restaking graph"
          >
            Show Full Graph (Alt/Cmd+Click)
          </button>
        </div>
        {/* Always show the token-specific graph if available */}
        {tokenGraphCode && (
          <div style={{ marginTop: '2em', background: '#181830', borderRadius: 8, padding: 12, overflowX: 'auto' }}>
            <div ref={tokenMermaidRef} />
            <pre style={{ fontSize: 12, color: '#888', marginTop: 8, whiteSpace: 'pre-wrap' }}>
              {tokenGraphCode}
            </pre>
          </div>
        )}
        {/* Show the full graph if requested */}
        {showGraph && (
          <div style={{ marginTop: '2em', background: '#181830', borderRadius: 8, padding: 12, overflowX: 'auto' }}>
            <div ref={mermaidRef} />
            <pre style={{ fontSize: 12, color: '#888', marginTop: 8, whiteSpace: 'pre-wrap' }}>
              {graphCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
