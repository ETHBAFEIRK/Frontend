import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clickedNode, setClickedNode] = useState(null);
  const mermaidContainerRef = useRef(null);

  // Handler to close modal
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setDialogOpen(false);
    setClickedNode(null);
  }, []);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setDialogOpen(false);
        setClickedNode(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  React.useEffect(() => {
    const handler = (e) => {
      // If event.detail.token is present, use its symbol as source
      const token = e.detail && e.detail.token;
      if (token && token.symbol) {
        setSourceSymbol(token.symbol);
        setGraphCode(buildSubgraphFromSource(rates, token.symbol));
        setMode('default');
        // Store the token object for use in dialog (for quantity)
        setClickedNode(prev => ({ ...prev, _mainPageToken: token }));
      } else {
        setSourceSymbol(null);
        setGraphCode(buildMermaidGraph(rates));
        setMode('full');
      }
      setIsOpen(true);
      setDialogOpen(false);
      // Don't clear clickedNode here, so we can keep _mainPageToken if present
    };
    window.addEventListener('show-mermaid-graph', handler);
    return () => window.removeEventListener('show-mermaid-graph', handler);
  }, [rates]);

  const handleShowFull = () => {
    setGraphCode(buildMermaidGraph(rates));
    setMode('full');
    setDialogOpen(false);
    setClickedNode(null);
  };

  const handleShowDefault = () => {
    if (sourceSymbol) {
      setGraphCode(buildSubgraphFromSource(rates, sourceSymbol));
      setMode('default');
      setDialogOpen(false);
      setClickedNode(null);
    }
  };

  // Add click handlers to mermaid nodes after render
  useEffect(() => {
    if (!isOpen) return;
    // Wait for Mermaid to render
    const timeout = setTimeout(() => {
      const container = document.getElementById("mermaid-graph-modal");
      if (!container) return;
      const svg = container.querySelector("svg");
      if (!svg) return;
      const nodeElems = svg.querySelectorAll('g.node, g[class*="node"]');
      // --- Parse the subgraph for incoming nodes ---
      // Only parse if in subgraph mode
      let incomingMap = {};
      if (mode === 'default' && graphCode) {
        // Parse edges from the Mermaid code
        // Look for lines like: FROM -->|label| TO or FROM --> TO
        const edgeRegex = /^\s*([A-Z0-9_]+)\s*-->\|?.*?\|?\s*([A-Z0-9_]+)\s*$/gm;
        let match;
        while ((match = edgeRegex.exec(graphCode)) !== null) {
          const from = match[1];
          const to = match[2];
          if (!incomingMap[to]) incomingMap[to] = [];
          incomingMap[to].push(from);
        }
      }
      nodeElems.forEach((nodeElem) => {
        // Try to extract nodeId from the id attribute, e.g. id="flowchart-STETH-1"
        let nodeId = null;
        const idAttr = nodeElem.getAttribute("id");
        if (idAttr && idAttr.startsWith("flowchart-")) {
          // e.g. flowchart-STETH-1 or flowchart-MSTETH-2
          const match = idAttr.match(/^flowchart-([A-Z0-9]+)-/);
          if (match) {
            nodeId = match[1];
          }
        }
        // Fallback: try to get from <text> or <p>
        if (!nodeId) {
          const textElem = nodeElem.querySelector("text");
          if (textElem && textElem.textContent) {
            nodeId = textElem.textContent.trim().split(" ")[0];
          }
        }
        // Only add click for STETH or MSTETH
        if (nodeId && (nodeId === "STETH" || nodeId === "MSTETH")) {
          nodeElem.style.cursor = "pointer";
          nodeElem.onclick = (e) => {
            e.stopPropagation();
            // Try to get the label text (with APY) from <p> inside <span class="nodeLabel">
            let label = nodeId;
            const pElem = nodeElem.querySelector("span.nodeLabel p");
            if (pElem && pElem.textContent) {
              label = pElem.textContent.trim();
            }
            // Find incoming nodes (if in subgraph mode)
            let incoming = [];
            if (mode === 'default' && incomingMap[nodeId]) {
              incoming = incomingMap[nodeId];
            }
            // --- Custom popup dialog like the pasted image ---
            if (incoming.length > 0) {
              // Find the first incoming token and its link/kind/apy from the rates
              const incomingToken = incoming[0];
              // Find the rate object in rates that matches incomingToken -> nodeId
              let rateObj = null;
              if (Array.isArray(rates)) {
                rateObj = rates.find(
                  r =>
                    (r.input_symbol || '').toUpperCase() === incomingToken &&
                    (r.output_token || '').toUpperCase() === nodeId
                );
              }
              // Fallback: if not found, just use incomingToken and nodeId
              let availableToStake = null;
              // Try to get available amount from the main page data (TokenTable tokens)
              // We'll look for a token with symbol === incomingToken
              let availableToken = null;
              if (window && window.__restaker_tokens) {
                availableToken = window.__restaker_tokens.find(
                  t => (t.symbol || '').toUpperCase() === incomingToken
                );
              }
              if (!availableToken && window && window.__restaker_last_tokens) {
                availableToken = window.__restaker_last_tokens.find(
                  t => (t.symbol || '').toUpperCase() === incomingToken
                );
              }
              if (availableToken && availableToken.quantity !== undefined) {
                availableToStake = availableToken.quantity;
              } else {
                availableToStake = "0.0";
              }
              let stakedAmount = nodeId;
              let apy = rateObj && rateObj.apy ? rateObj.apy : null;
              let kind = rateObj && rateObj.output_kind ? rateObj.output_kind : '';
              let link = rateObj && rateObj.project_link ? rateObj.project_link : null;
              let verb = (kind === "stake" || kind === "restake") ? kind : "stake";
              if (!verb) verb = "stake";

              // State for input amount
              // Move React state to the component level, not inside callback
              setDialogOpen(true);
              setClickedNode(prev => ({
                incomingToken,
                availableToStake,
                stakedAmount: nodeId,
                apy,
                kind,
                link,
                verb,
                // Pass through the main page token quantity if available
                _mainPageToken: prev && prev._mainPageToken ? prev._mainPageToken : undefined,
              }));
            }
          };
        }
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [graphCode, isOpen, mode]);

  // --- Dialog state for stake modal ---
  const [stakeDialog, setStakeDialog] = useState({
    open: false,
    incomingToken: "",
    availableToStake: "",
    stakedAmount: "",
    apy: null,
    kind: "",
    link: "",
    verb: "",
    amount: "",
  });

  // When clickedNode is set, open the stake dialog and populate fields
  useEffect(() => {
    if (dialogOpen && clickedNode && typeof clickedNode === "object") {
      setStakeDialog({
        open: true,
        incomingToken: clickedNode.incomingToken,
        availableToStake: clickedNode.availableToStake,
        stakedAmount: clickedNode.stakedAmount,
        apy: clickedNode.apy,
        kind: clickedNode.kind,
        link: clickedNode.link,
        verb: clickedNode.verb,
        amount: "",
      });
    } else {
      setStakeDialog((prev) => ({ ...prev, open: false }));
    }
  }, [dialogOpen, clickedNode]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(246, 247, 251, 0.92)",
        zIndex: 2000,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        margin: 0
      }}
      onClick={handleClose}
    >
      <div
        className="modal-content"
        style={{
          background: "#fff",
          border: "2.5px solid #e0e0e0",
          boxShadow: "0 4px 32px 0 rgba(58, 130, 246, 0.07)",
          color: "#232323",
          width: "95vw",
          height: "80vh",
          maxWidth: "1100px",
          maxHeight: "80vh",
          padding: "2.5rem 2.2rem 2.2rem 2.2rem",
          margin: 0,
          borderRadius: "24px",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "0.5rem",
          marginBottom: "1.2rem",
          minHeight: "2.6rem"
        }}>
          <h2 style={{
            color: "#232323",
            textAlign: "left",
            margin: 0,
            fontSize: "2.2rem",
            fontWeight: 800,
            letterSpacing: "-1px",
            lineHeight: 1.1,
            flex: 1
          }}>
            {mode === 'default' && sourceSymbol
              ? `Restaking Paths from ${sourceSymbol}`
              : 'Full Restaking Graph'}
          </h2>
          <button
            className="modal-close-button"
            style={{
              position: "static",
              marginLeft: "1.2rem",
              fontSize: "2.1rem",
              color: "#232323",
              background: "none",
              border: "none",
              cursor: "pointer",
              lineHeight: 1,
              fontWeight: 700,
              transition: "color 0.2s"
            }}
            onClick={handleClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
          {mode === 'default' && (
            <button
              className="side-action-button"
              style={{
                background: "#f8f5ef",
                color: "#3b82f6",
                border: "1.5px solid #3b82f6",
                borderRadius: "16px",
                fontWeight: 600,
                fontSize: "0.98rem",
                padding: "0.35rem 1.1rem",
                minWidth: "auto",
                minHeight: "auto",
                boxShadow: "none",
                marginRight: 0,
                marginLeft: 0,
                cursor: "pointer",
                transition: "background 0.18s, color 0.18s, border 0.18s"
              }}
              onClick={handleShowFull}
              title="Show the full restaking graph"
            >
              Show full graph
            </button>
          )}
          {mode === 'full' && sourceSymbol && (
            <button
              className="side-action-button"
              style={{
                background: "#f8f5ef",
                color: "#3b82f6",
                border: "1.5px solid #3b82f6",
                borderRadius: "16px",
                fontWeight: 600,
                fontSize: "0.98rem",
                padding: "0.35rem 1.1rem",
                minWidth: "auto",
                minHeight: "auto",
                boxShadow: "none",
                marginRight: 0,
                marginLeft: 0,
                cursor: "pointer",
                transition: "background 0.18s, color 0.18s, border 0.18s"
              }}
              onClick={handleShowDefault}
              title={`Show only paths from ${sourceSymbol}`}
            >
              Show only paths from {sourceSymbol}
            </button>
          )}
          <button
            className="side-action-button"
            style={{
              background: "#fff",
              color: "#232323",
              border: "1.5px solid #e0e0e0",
              borderRadius: "16px",
              fontWeight: 600,
              fontSize: "0.98rem",
              padding: "0.35rem 1.1rem",
              minWidth: "auto",
              minHeight: "auto",
              boxShadow: "none",
              marginRight: 0,
              marginLeft: 0,
              cursor: "pointer",
              transition: "background 0.18s, color 0.18s, border 0.18s"
            }}
            onClick={handleClose}
            title="Cancel and close"
          >
            Cancel
          </button>
        </div>
        <div
          style={{
            flex: 1,
            margin: "0 auto",
            width: "98%",
            height: "80%",
            background: "#f8f5ef",
            borderRadius: 12,
            padding: 16,
            overflow: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1.5px solid #e0e0e0"
          }}
        >
          <div style={{ width: "100%", height: "100%" }} ref={mermaidContainerRef}>
            <Mermaid chart={graphCode} id="mermaid-graph-modal" />
            {stakeDialog.open && (
              <div
                style={{
                  position: "fixed",
                  left: 0,
                  top: 0,
                  width: "100vw",
                  height: "100vh",
                  zIndex: 3000,
                  background: "rgba(0,0,0,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => { setDialogOpen(false); setClickedNode(null); }}
              >
                <div
                  style={{
                    background: "#23242a",
                    border: "2px solid #3b82f6",
                    borderRadius: 24,
                    padding: "2.2rem 2.5rem",
                    minWidth: 320,
                    minHeight: 120,
                    boxShadow: "0 4px 32px 0 rgba(58, 130, 246, 0.13)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    color: "#fff"
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 18,
                      background: "none",
                      border: "none",
                      color: "#fff",
                      fontSize: "1.7rem",
                      cursor: "pointer",
                      fontWeight: 700
                    }}
                    onClick={() => { setDialogOpen(false); setClickedNode(null); }}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                  {/* --- Stake Dialog Content --- */}
                  <div style={{ width: 420, maxWidth: "90vw" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.25rem", color: "#fff", marginBottom: 18 }}>
                      {/* Show token quantity in the dialog title if available */}
                      {stakeDialog._mainPageToken && stakeDialog._mainPageToken.quantity !== undefined ? (
                        <>
                          {stakeDialog._mainPageToken.quantity} {stakeDialog._mainPageToken.symbol} available
                        </>
                      ) : (
                        <>
                          Available to {stakeDialog.verb}
                        </>
                      )}
                      <span style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        background: "#4ade80",
                        borderRadius: "50%",
                        marginLeft: 8,
                        verticalAlign: "middle"
                      }}></span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                      <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff", opacity: 0.85 }}>
                        {/* (kept for layout) */}
                      </div>
                      {stakeDialog.link && (
                        <a href={stakeDialog.link} target="_blank" rel="noopener noreferrer"
                          style={{
                            background: "#23242a",
                            color: "#fff",
                            borderRadius: 16,
                            padding: "0.3em 1em 0.3em 1em",
                            fontWeight: 600,
                            fontSize: "0.98rem",
                            textDecoration: "none",
                            border: "1.5px solid #3b82f6",
                            display: "flex",
                            alignItems: "center",
                            gap: 8
                          }}>
                          {stakeDialog.incomingToken}
                          <span style={{
                            display: "inline-block",
                            width: 18,
                            height: 18,
                            background: "#3b82f6",
                            borderRadius: "50%",
                            marginLeft: 6
                          }}></span>
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize: "2.1rem", fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                      {stakeDialog.availableToStake} {stakeDialog.incomingToken}
                    </div>
                    <hr style={{ border: "none", borderTop: "1.5px solid #444", margin: "1.2rem 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff", opacity: 0.85 }}>
                        {stakeDialog.verb.charAt(0).toUpperCase() + stakeDialog.verb.slice(1)}d amount
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff", opacity: 0.85 }}>
                        APY
                        <span style={{
                          marginLeft: 6,
                          fontSize: "1.1rem",
                          color: "#fff",
                          opacity: 0.7,
                          cursor: "pointer"
                        }}
                          title="Annual Percentage Rate for Lido staking"
                        >&#9432;</span>
                        <span style={{ color: "#4ade80", fontWeight: 800, marginLeft: 8, fontSize: "1.2rem" }}>
                          {stakeDialog.apy !== null && stakeDialog.apy !== undefined ? (
                            typeof stakeDialog.apy === "number"
                              ? stakeDialog.apy
                              : String(stakeDialog.apy)
                          ) : "N/A"}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: "2.1rem", fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                      0.0 {stakeDialog.stakedAmount}
                    </div>
                    <div style={{ margin: "1.2rem 0 0.7rem 0" }}>
                      <label style={{ fontWeight: 600, color: "#fff", marginRight: 8 }}>
                        Amount to {stakeDialog.verb}:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={stakeDialog.availableToStake}
                        step="any"
                        value={stakeDialog.amount}
                        onChange={e => setStakeDialog(sd => ({ ...sd, amount: e.target.value }))}
                        placeholder={`0.0 ${stakeDialog.incomingToken}`}
                        style={{
                          width: 120,
                          padding: "0.4em 0.8em",
                          borderRadius: 8,
                          border: "1.5px solid #3b82f6",
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          background: "#181a20",
                          color: "#fff",
                          marginLeft: 8
                        }}
                      />
                      <button
                        style={{
                          marginLeft: 10,
                          background: "#3b82f6",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: "1.0rem",
                          padding: "0.3em 1.1em",
                          cursor: "pointer"
                        }}
                        onClick={() => setStakeDialog(sd => ({ ...sd, amount: stakeDialog.availableToStake }))}
                        type="button"
                      >
                        MAX
                      </button>
                    </div>
                    <div style={{
                      marginTop: 24,
                      display: "flex",
                      justifyContent: "center"
                    }}>
                      <button
                        style={{
                          background: "#3b82f6",
                          color: "#fff",
                          border: "none",
                          borderRadius: 16,
                          fontWeight: 700,
                          fontSize: "1.15rem",
                          padding: "0.7rem 2.2rem",
                          cursor: "pointer",
                          boxShadow: "0 2px 8px 0 rgba(58, 130, 246, 0.13)"
                        }}
                        onClick={() => { setDialogOpen(false); setClickedNode(null); }}
                      >
                        Execute
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MermaidGraphModal;
