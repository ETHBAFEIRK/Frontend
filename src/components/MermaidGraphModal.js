import React, { useEffect, useRef, useState } from 'react';

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
  const mermaidRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      setGraphCode(buildMermaidGraph(rates));
      setIsOpen(true);
    };
    window.addEventListener('show-mermaid-graph', handler);
    return () => window.removeEventListener('show-mermaid-graph', handler);
  }, [rates]);

  useEffect(() => {
    if (isOpen && graphCode && mermaidRef.current) {
      const domDocument = mermaidRef.current.ownerDocument || window.document;
      import('mermaid').then((mermaid) => {
        mermaidRef.current.innerHTML = '';
        mermaid.default.initialize({ startOnLoad: false, theme: "dark" });
        const tempDiv = domDocument.createElement('div');
        mermaid.default.render('mermaid-graph-modal', graphCode, (svgCode) => {
          mermaidRef.current.innerHTML = svgCode;
        }, tempDiv);
      });
    }
  }, [isOpen, graphCode]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setIsOpen(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-button" onClick={() => setIsOpen(false)}>
          &times;
        </button>
        <h2>Full Restaking Graph</h2>
        <div style={{ marginTop: '2em', background: '#181830', borderRadius: 8, padding: 12, overflowX: 'auto' }}>
          <div ref={mermaidRef} />
          <pre style={{ fontSize: 12, color: '#888', marginTop: 8, whiteSpace: 'pre-wrap' }}>
            {graphCode}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default MermaidGraphModal;
