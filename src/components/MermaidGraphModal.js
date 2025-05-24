import React, { useState } from 'react';
import Mermaid from './Mermaid';

/**
 * Build a subgraph from a source token to only those end nodes
 * where the APY is the maximum reachable from the source.
 * Only the paths to these "max APY" end nodes are included.
 */
function buildSubgraphFromSource(rates, sourceSymbol) {
  if (!Array.isArray(rates) || !sourceSymbol) return '';
  // Build adjacency list and edge info
  const adj = {};
  const edgeInfo = {};
  const nodes = new Set();
  for (const rate of rates) {
    const from = (rate.input_symbol || '').toUpperCase();
    const to = (rate.output_token || '').toUpperCase();
    if (!from || !to) continue;
    if (!adj[from]) adj[from] = [];
    adj[from].push({ to, kind: rate.output_kind || '', apy: rate.apy });
    nodes.add(from);
    nodes.add(to);
    edgeInfo[`${from}|${to}`] = edgeInfo[`${from}|${to}`] || [];
    edgeInfo[`${from}|${to}`].push({ kind: rate.output_kind || '', apy: rate.apy });
  }

  // Find all best-APY nodes reachable from source
  // We'll do BFS from source, and for each node, keep the best APY path to it
  const bestApy = {};
  const prev = {};
  const bestKind = {};
  const queue = [{ symbol: sourceSymbol.toUpperCase(), apy: 0 }];
  bestApy[sourceSymbol.toUpperCase()] = 0;

  while (queue.length > 0) {
    const { symbol, apy } = queue.shift();
    if (!adj[symbol]) continue;
    for (const edge of adj[symbol]) {
      const nextApy = edge.apy;
      // If this path is better, update
      if (
        bestApy[edge.to] === undefined ||
        nextApy > bestApy[edge.to]
      ) {
        bestApy[edge.to] = nextApy;
        prev[edge.to] = symbol;
        bestKind[`${symbol}|${edge.to}`] = edge.kind;
        queue.push({ symbol: edge.to, apy: nextApy });
      }
    }
  }

  // Find the maximum APY among all reachable nodes (excluding the source)
  const bestNodes = Object.keys(bestApy).filter(n => n !== sourceSymbol.toUpperCase());
  let maxApy = null;
  for (const n of bestNodes) {
    if (maxApy === null || bestApy[n] > maxApy) {
      maxApy = bestApy[n];
    }
  }
  // Only keep end nodes where apy == maxApy
  const endNodes = bestNodes.filter(n => bestApy[n] === maxApy);

  // For each end node, reconstruct the path from source
  const edges = [];
  const nodeSet = new Set([sourceSymbol.toUpperCase()]);
  for (const node of endNodes) {
    let curr = node;
    while (prev[curr]) {
      const from = prev[curr];
      const to = curr;
      const kind = bestKind[`${from}|${to}`] || '';
      edges.push({ from, to, kind });
      nodeSet.add(from);
      nodeSet.add(to);
      curr = from;
      if (curr === sourceSymbol.toUpperCase()) break;
    }
  }

  // Remove duplicate edges
  const uniqueEdges = [];
  const seen = new Set();
  for (const e of edges) {
    const key = `${e.from}|${e.to}`;
    if (!seen.has(key)) {
      uniqueEdges.push(e);
      seen.add(key);
    }
  }

  // Build mermaid code
  const mermaid = ['graph TD'];
  for (const node of Array.from(nodeSet)) {
    const apy = bestApy[node];
    if (apy !== undefined && node !== sourceSymbol.toUpperCase()) {
      mermaid.push(`    ${node}["${node} (${apy.toFixed(2)}%)"]`);
    } else {
      mermaid.push(`    ${node}["${node}"]`);
    }
  }
  for (const { from, to, kind } of uniqueEdges) {
    const label = kind ? kind.replace(/"/g, '\\"') : '';
    if (label) {
      mermaid.push(`    ${from} -->|${label}| ${to}`);
    } else {
      mermaid.push(`    ${from} --> ${to}`);
    }
  }
  return mermaid.join('\n');
}

function buildMermaidGraph(rates) {
  if (!Array.isArray(rates)) return '';
  const token_icons = new Set([
    "ETH", "WETH", "stETH", "wstETH", "ezETH", "pzETH", "STONE", "xPufETH", "mstETH", "weETH", "egETH",
    "inwstETH", "rsETH", "LsETH", "USDC", "USDT", "USDe", "FBTC", "LBTC", "mBTC", "pumpBTC", "mswETH",
    "mwBETH", "mETH", "rstETH", "steakLRT", "Re7LRT", "amphrETH", "rswETH", "swETH", "weETHs"
  ]);
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

  const adj = {};
  const rev_adj = {};
  for (const key of Object.keys(edge_map)) {
    const [from_token, to_token] = key.split('|');
    if (!adj[from_token]) adj[from_token] = new Set();
    if (!rev_adj[to_token]) rev_adj[to_token] = new Set();
    adj[from_token].add(to_token);
    rev_adj[to_token].add(from_token);
  }

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

  const pruned_nodes = new Set();
  const pruned_edges = [];
  for (const key of Object.keys(edge_map)) {
    const [from_token, to_token] = key.split('|');
    if (!reachable.has(to_token)) continue;
    if (!token_icons.has(to_token)) continue;
    pruned_nodes.add(from_token);
    pruned_nodes.add(to_token);
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

const MermaidGraphModal = ({ rates }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [graphCode, setGraphCode] = useState('');
  const [mode, setMode] = useState('default'); // 'default' (subgraph) or 'full'
  const [sourceSymbol, setSourceSymbol] = useState(null);

  React.useEffect(() => {
    const handler = (e) => {
      // If event.detail.token is present, use its symbol as source
      const token = e.detail && e.detail.token;
      if (token && token.symbol) {
        setSourceSymbol(token.symbol);
        setGraphCode(buildSubgraphFromSource(rates, token.symbol));
        setMode('default');
      } else {
        setSourceSymbol(null);
        setGraphCode(buildMermaidGraph(rates));
        setMode('full');
      }
      setIsOpen(true);
    };
    window.addEventListener('show-mermaid-graph', handler);
    return () => window.removeEventListener('show-mermaid-graph', handler);
  }, [rates]);

  const handleShowFull = () => {
    setGraphCode(buildMermaidGraph(rates));
    setMode('full');
  };

  const handleShowDefault = () => {
    if (sourceSymbol) {
      setGraphCode(buildSubgraphFromSource(rates, sourceSymbol));
      setMode('default');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.95)",
        zIndex: 2000,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        margin: 0
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="modal-content"
        style={{
          background: "none",
          border: "none",
          boxShadow: "none",
          color: "#e0e0e0",
          width: "90vw",
          height: "90vh",
          maxWidth: "90vw",
          maxHeight: "90vh",
          padding: 0,
          margin: 0,
          borderRadius: 0,
          display: "flex",
          flexDirection: "column"
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="modal-close-button"
          style={{
            position: "absolute",
            top: 24,
            right: 36,
            zIndex: 2100,
            fontSize: "2.5rem",
            color: "#00ffff",
            background: "none",
            border: "none",
            cursor: "pointer"
          }}
          onClick={() => setIsOpen(false)}
        >
          &times;
        </button>
        <h2 style={{ color: "#00ffff", textAlign: "center", margin: "2rem 0 1rem 0", fontSize: "2.2rem" }}>
          {mode === 'default' && sourceSymbol
            ? `Restaking Paths from ${sourceSymbol}`
            : 'Full Restaking Graph'}
        </h2>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 8 }}>
          {mode === 'default' && (
            <button
              className="action-button"
              style={{ background: "#222", color: "#00ffff", border: "1px solid #00ffff" }}
              onClick={handleShowFull}
            >
              Show Full Graph
            </button>
          )}
          {mode === 'full' && sourceSymbol && (
            <button
              className="action-button"
              style={{ background: "#222", color: "#00ffff", border: "1px solid #00ffff" }}
              onClick={handleShowDefault}
            >
              Show Only Paths from {sourceSymbol}
            </button>
          )}
        </div>
        <div
          style={{
            flex: 1,
            margin: "0 auto",
            width: "98%",
            height: "80%",
            background: "#181830",
            borderRadius: 12,
            padding: 16,
            overflow: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div style={{ width: "100%", height: "100%" }}>
            <Mermaid chart={graphCode} id="mermaid-graph-modal" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MermaidGraphModal;
