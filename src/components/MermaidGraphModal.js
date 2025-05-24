import React, { useState } from 'react';
import Mermaid from './Mermaid';

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

  React.useEffect(() => {
    const handler = (e) => {
      setGraphCode(buildMermaidGraph(rates));
      setIsOpen(true);
    };
    window.addEventListener('show-mermaid-graph', handler);
    return () => window.removeEventListener('show-mermaid-graph', handler);
  }, [rates]);

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
        alignItems: "stretch",
        justifyContent: "stretch",
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
          width: "100vw",
          height: "100vh",
          maxWidth: "100vw",
          maxHeight: "100vh",
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
          Full Restaking Graph
        </h2>
        <div
          style={{
            flex: 1,
            margin: "0 auto",
            width: "98vw",
            height: "80vh",
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
