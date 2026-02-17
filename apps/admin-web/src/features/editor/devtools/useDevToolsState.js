import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  createImportTransformRegistry,
  createRendererRegistry,
  corePackImportTransforms,
  corePackRenderers,
  importWpBlocksToCanonical,
  renderCanonicalNodes
} from '../parity/index.js';

const DEVTOOLS_STORAGE_KEY = 'ep-devtools-state';
const DEVTOOLS_ENABLED_KEY = 'ep-devtools-enabled';

export function isDevToolsToggleShortcut(event) {
  if (!event) return false;
  const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
  return (event.ctrlKey || event.metaKey) && event.shiftKey && key === 'd';
}

export function summarizeDiagnostics(importDiagnostics, renderDiagnostics) {
  const importCounts = importDiagnostics?.counts || {};
  const renderCounts = renderDiagnostics?.counts || {};
  return {
    transformed: (importCounts.transformed || 0) + (renderCounts.transformed || 0),
    partial: (importCounts.partial || 0) + (renderCounts.partial || 0),
    fallback: (importCounts.fallback || 0) + (renderCounts.fallback || 0),
    unsupported: (importCounts.unsupported || 0) + (renderCounts.unsupported || 0)
  };
}

function isDevMode() {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('ep-devtools-force') === 'true';
    }
    return false;
  }
  return true;
}

function loadStoredState() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEVTOOLS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    if (error instanceof Error && error.name === 'SyntaxError') {
      return null;
    }
    return null;
  }
}

function saveStoredState(state) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DEVTOOLS_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      return;
    }
  }
}

function loadEnabledState() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(DEVTOOLS_ENABLED_KEY) === 'true';
}

function saveEnabledState(enabled) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DEVTOOLS_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      return;
    }
  }
}

const TABS = ['blocks', 'diagnostics', 'tracer', 'tokens'];

export function useDevToolsState({ blocks = [], themeTokens = {} } = {}) {
  const [isAvailable] = useState(() => isDevMode());
  const [isOpen, setIsOpen] = useState(() => loadEnabledState());
  const [activeTab, setActiveTab] = useState(() => {
    const stored = loadStoredState();
    return stored?.activeTab && TABS.includes(stored.activeTab) ? stored.activeTab : 'blocks';
  });
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(null);
  const [tracerStep, setTracerStep] = useState(0);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const importRegistry = useMemo(
    () => createImportTransformRegistry(corePackImportTransforms),
    []
  );
  const rendererRegistry = useMemo(
    () => createRendererRegistry(corePackRenderers),
    []
  );

  const parityResult = useMemo(() => {
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return {
        nodes: [],
        diagnostics: { items: [], counts: { transformed: 0, partial: 0, fallback: 0, unsupported: 0 } }
      };
    }
    return importWpBlocksToCanonical({ blocks, importRegistry });
  }, [blocks, importRegistry]);

  const renderResult = useMemo(() => {
    if (parityResult.nodes.length === 0) {
      return {
        output: [],
        diagnostics: { items: [], counts: { transformed: 0, partial: 0, fallback: 0, unsupported: 0 } }
      };
    }
    return renderCanonicalNodes({
      nodes: parityResult.nodes,
      rendererRegistry,
      target: 'editor'
    });
  }, [parityResult.nodes, rendererRegistry]);

  const combinedDiagnostics = useMemo(() => {
    return {
      import: parityResult.diagnostics,
      render: renderResult.diagnostics,
      summary: summarizeDiagnostics(parityResult.diagnostics, renderResult.diagnostics)
    };
  }, [parityResult.diagnostics, renderResult.diagnostics]);

  const tracerData = useMemo(() => {
    if (selectedBlockIndex === null || !blocks[selectedBlockIndex]) {
      return null;
    }
    const wpBlock = blocks[selectedBlockIndex];
    const canonicalNode = parityResult.nodes[selectedBlockIndex];
    const renderedOutput = renderResult.output?.[selectedBlockIndex];

    return {
      steps: [
        { label: 'WP Block', data: wpBlock },
        { label: 'Canonical Node', data: canonicalNode },
        { label: 'Render Output', data: renderedOutput }
      ],
      wpBlock,
      canonicalNode,
      renderedOutput
    };
  }, [selectedBlockIndex, blocks, parityResult.nodes, renderResult.output]);

  useEffect(() => {
    if (!isAvailable) return undefined;

    function handleKeyDown(event) {
      if (isDevToolsToggleShortcut(event)) {
        event.preventDefault();
        setIsOpen(prev => {
          const next = !prev;
          saveEnabledState(next);
          return next;
        });
      }
    }

    globalThis.document?.addEventListener('keydown', handleKeyDown);
    return () => globalThis.document?.removeEventListener('keydown', handleKeyDown);
  }, [isAvailable]);

  useEffect(() => {
    saveStoredState({ activeTab });
  }, [activeTab]);

  useEffect(() => {
    setSelectedBlockIndex(null);
    setTracerStep(0);
  }, [blocks]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      saveEnabledState(next);
      return next;
    });
  }, []);

  const selectTab = useCallback((tab) => {
    if (TABS.includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const selectBlock = useCallback((index) => {
    setSelectedBlockIndex(index);
    setTracerStep(0);
  }, []);

  const toggleNodeExpanded = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const nextTracerStep = useCallback(() => {
    setTracerStep(prev => Math.min(prev + 1, 2));
  }, []);

  const prevTracerStep = useCallback(() => {
    setTracerStep(prev => Math.max(prev - 1, 0));
  }, []);

  const selectTracerStep = useCallback((step) => {
    const numericStep = Number(step);
    if (!Number.isFinite(numericStep)) return;
    setTracerStep(Math.max(0, Math.min(Math.trunc(numericStep), 2)));
  }, []);

  return {
    isAvailable,
    isOpen,
    toggleOpen,
    activeTab,
    selectTab,
    tabs: TABS,
    blocks,
    canonicalNodes: parityResult.nodes,
    selectedBlockIndex,
    selectBlock,
    expandedNodes,
    toggleNodeExpanded,
    diagnostics: combinedDiagnostics,
    tracerData,
    tracerStep,
    selectTracerStep,
    nextTracerStep,
    prevTracerStep,
    themeTokens,
    importRegistry,
    rendererRegistry
  };
}

export const devToolsTabs = TABS;
