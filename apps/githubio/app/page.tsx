'use client';

import React, { useState, useEffect } from 'react';
import {
  NmapTopologyView,
  NmapGeoMap,
  NmapDiffView,
  NmapStats,
  NmapCommandViewer,
  ScanUploader,
  HostTable,
  HostDetailDrawer,
  parseNmapXml,
  updateHostInScan,
  generateNetworkScenario,
  SAMPLE_SCANS,
} from 'nastymap';
import type { NmapHost, NmapRun, TopologyNode, HostAction, CustomDrawerTab } from 'nastymap';
import { ThreatHuntGame } from '../components/ThreatHuntGame';
import { DocsPlayground } from '../components/DocsPlayground';
import {
  Network,
  Globe,
  GitCompare,
  Server,
  BarChart2,
  Terminal,
  Upload,
  BookOpen,
  Shield,
  Sparkles,
  ChevronDown,
  Activity,
  X,
  Zap,
  Gamepad2,
  ExternalLink,
} from 'lucide-react';

export default function GitHubIoShowcase() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Current active scan
  const [currentScan, setCurrentScan] = useState<NmapRun>(() => {
    return parseNmapXml(SAMPLE_SCANS.enterprise.xml);
  });
  const [activeScanLabel, setActiveScanLabel] = useState<string>(SAMPLE_SCANS.enterprise.name);

  // Active top-level showcase tab
  const [activeTab, setActiveTab] = useState<
    'topology' | 'game' | 'geo' | 'diff' | 'hosts' | 'stats' | 'command' | 'docs'
  >('topology');

  // Selected host for HostDetailDrawer
  const [selectedHost, setSelectedHost] = useState<NmapHost | null>(null);

  // XML Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Custom Actions for Hosts
  const customActions: HostAction[] = [
    {
      id: 'quarantine-host',
      label: 'Quarantine Host',
      icon: <Shield size={14} className="text-amber-400" />,
      shortcut: 'q',
      variant: 'warning',
      tooltip: 'Toggle quarantine isolation status (Shortcut: Q)',
      onClick: async (host, context) => {
        const nextState = !host.isQuarantined;
        context.updateHost((prev) => ({
          isQuarantined: nextState,
          tags: nextState
            ? Array.from(new Set([...(prev.tags || []), 'quarantined']))
            : (prev.tags || []).filter((t) => t !== 'quarantined'),
        }));
        context.notify?.(
          nextState
            ? `Host ${host.ipv4 || host.id} placed in Quarantine.`
            : `Host ${host.ipv4 || host.id} released from Quarantine.`,
          nextState ? 'warning' : 'info'
        );
      },
    },
    {
      id: 'flag-threat',
      label: 'Flag / Audit',
      icon: <Sparkles size={14} className="text-sky-400" />,
      shortcut: 'f',
      variant: 'primary',
      tooltip: 'Mark host for detailed security inspection (Shortcut: F)',
      onClick: async (host, context) => {
        const nextFlag = !host.isFlagged;
        context.updateHost((prev) => ({
          isFlagged: nextFlag,
          tags: nextFlag
            ? Array.from(new Set([...(prev.tags || []), 'investigate']))
            : (prev.tags || []).filter((t) => t !== 'investigate'),
        }));
        context.notify?.(
          nextFlag ? `Host ${host.ipv4 || host.id} flagged.` : `Host unflagged.`,
          'info'
        );
      },
    },
  ];

  // Custom Injected Tabs for HostDetailDrawer
  const customDrawerTabs: CustomDrawerTab[] = [
    {
      id: 'sec-notes',
      label: 'Security Notes',
      render: (host, updateHost) => (
        <div className="space-y-3 font-sans text-xs">
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="font-bold text-sky-400">Analyst Comments</span>
            <p className="text-zinc-400 text-[11px]">
              {host.customData?.comments || 'No analyst notes yet.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const note = prompt('Enter analyst note:', host.customData?.comments || '');
                if (note !== null) {
                  updateHost((prev) => ({
                    customData: { ...(prev.customData || {}), comments: note },
                  }));
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-700/60 text-xs font-semibold"
            >
              Edit Analyst Note
            </button>
          </div>
        </div>
      ),
    },
  ];

  const handleUpdateHost = (hostId: string, updater: (prev: NmapHost) => NmapHost | Partial<NmapHost>) => {
    setCurrentScan((prev) => updateHostInScan(prev, hostId, updater));
    if (selectedHost && (selectedHost.id === hostId || selectedHost.ipv4 === hostId)) {
      setSelectedHost((prev) => (prev ? ({ ...prev, ...updater(prev) } as NmapHost) : null));
    }
  };

  const selectedNodeForDrawer: TopologyNode | null = selectedHost
    ? {
        id: selectedHost.id,
        label: selectedHost.primaryHostname || selectedHost.ipv4 || selectedHost.id,
        ip: selectedHost.ipv4 || selectedHost.id,
        nodeType: 'host',
        status: selectedHost.status.state,
        osFamily: selectedHost.osFamily || 'Unknown',
        osName: selectedHost.primaryOs || 'Unknown OS',
        deviceType: selectedHost.deviceType || 'general',
        openPorts: selectedHost.ports.filter((p) => p.state === 'open').map((p) => p.portid),
        openPortDetails: selectedHost.ports,
        latencyMs: selectedHost.latencyMs,
        hopsAway: selectedHost.distance || 1,
        isQuarantined: selectedHost.isQuarantined,
        isFlagged: selectedHost.isFlagged,
        subnet: selectedHost.ipv4 ? `${selectedHost.ipv4.split('.').slice(0, 3).join('.')}.0/24` : 'Other',
        hostRef: selectedHost,
        geolocation: selectedHost.geolocation,
        x: 0,
        y: 0,
        radius: 20,
      }
    : null;

  const handleSelectSample = (sampleKey: 'enterprise' | 'global' | 'breachDiff' | 'randomNetwork') => {
    if (sampleKey === 'randomNetwork') {
      const generated = generateNetworkScenario({ totalHosts: 24, threatCount: 2 });
      setCurrentScan(generated.scan);
      setActiveScanLabel('Live Subnet (Phones, Laptops & Threats)');
      setActiveTab('topology');
      return;
    }
    const s = SAMPLE_SCANS[sampleKey];
    if (sampleKey === 'breachDiff') {
      setCurrentScan(parseNmapXml(SAMPLE_SCANS.breachDiff.xmlB));
      setActiveScanLabel('Security Breach Incident');
      setActiveTab('diff');
    } else if (s.xml) {
      setCurrentScan(parseNmapXml(s.xml));
      setActiveScanLabel(s.name);
      if (sampleKey === 'global') setActiveTab('geo');
      else setActiveTab('topology');
    }
  };

  const handleScanLoaded = (scan: NmapRun, label?: string) => {
    setCurrentScan(scan);
    setActiveScanLabel(label || scan.args || 'Custom Uploaded Scan');
    setShowUploadModal(false);
  };

  const totalOpenPorts = currentScan.hosts.reduce(
    (acc, h) => acc + h.ports.filter((p) => p.state === 'open').length,
    0
  );

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#050811] text-zinc-100 font-sans flex items-center justify-center">
        <div className="flex items-center gap-3 text-sky-400 font-mono text-xs">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Initializing NastyMap Static Showcase...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050811] text-zinc-100 font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Header / Brand Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-sky-900/30 border border-sky-400/40">
            <Network size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-zinc-200 to-sky-300 bg-clip-text text-transparent">
                NASTYMAP
              </h1>
              <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 font-mono text-[10px] font-bold border border-sky-800/50">
                v1.0
              </span>
              <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-mono text-[10px] font-bold border border-purple-800/50 hidden sm:inline">
                GITHUB PAGES
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono hidden sm:block">
              Nmap Graphical Topology, GeoIP & Cyber Threat Visualizer
            </p>
          </div>
        </div>

        {/* Scan Selector & Quick Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Preset Selector Dropdown */}
          <div className="relative group hidden md:block">
            <button className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-2 transition-colors">
              <Sparkles size={14} className="text-amber-400" />
              <span className="truncate max-w-[180px]">{activeScanLabel}</span>
              <ChevronDown size={14} className="text-zinc-500" />
            </button>
            <div className="absolute right-0 mt-1 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50 animate-fade-in">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                Sample Scans
              </div>
              <button
                onClick={() => handleSelectSample('randomNetwork')}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-zinc-900 transition-colors text-emerald-300 flex items-center justify-between"
              >
                <span>Live Subnet (Phones/Laptops)</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">Random</span>
              </button>
              <button
                onClick={() => handleSelectSample('enterprise')}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-zinc-900 transition-colors text-zinc-200 flex items-center justify-between"
              >
                <span>Enterprise Subnets (RFC1918)</span>
                <span className="text-[10px] font-mono text-zinc-500">8 Hosts</span>
              </button>
              <button
                onClick={() => handleSelectSample('global')}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-zinc-900 transition-colors text-zinc-200 flex items-center justify-between"
              >
                <span>Global Cloud Perimeter (GeoIP)</span>
                <span className="text-[10px] font-mono text-zinc-500">8 Regions</span>
              </button>
              <button
                onClick={() => handleSelectSample('breachDiff')}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-zinc-900 transition-colors text-zinc-200 flex items-center justify-between"
              >
                <span>Security Breach Incident (Diff)</span>
                <span className="text-[10px] font-mono text-rose-400">Incident</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-400">Hosts:</span>
              <span className="font-bold text-white">{currentScan.hosts.length}</span>
            </div>
            <span className="text-zinc-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">Ports:</span>
              <span className="font-bold text-sky-400">{totalOpenPorts}</span>
            </div>
          </div>

          {/* Upload Custom XML */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Upload and visualize your own Nmap XML scan file"
          >
            <Upload size={14} className="text-sky-400" />
            <span className="hidden sm:inline">Upload XML</span>
          </button>

          {/* GitHub Repo Link */}
          <a
            href="https://github.com/tekromancy/NastyMap"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="View NastyMap on GitHub"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </header>

      {/* Main Tabs Navigation Bar */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/50 backdrop-blur-md px-4 sm:px-6">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('topology')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'topology'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Network size={15} />
            <span>Topology Graph</span>
          </button>

          <button
            onClick={() => setActiveTab('game')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'game'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/30'
            }`}
          >
            <Gamepad2 size={15} className="animate-pulse" />
            <span>Cyber Threat Hunter Game</span>
          </button>

          <button
            onClick={() => setActiveTab('geo')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'geo'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Globe size={15} />
            <span>Geo Threat Map</span>
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'diff'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <GitCompare size={15} />
            <span>Scan Diffing</span>
          </button>

          <button
            onClick={() => setActiveTab('hosts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'hosts'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Server size={15} />
            <span>Host Table</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'stats'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <BarChart2 size={15} />
            <span>Scan Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('command')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'command'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Terminal size={15} />
            <span>Nmap Command</span>
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'docs'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <BookOpen size={15} />
            <span>Docs & API</span>
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* VIEW: TOPOLOGY GRAPH */}
        {activeTab === 'topology' && (
          <div className="space-y-4">
            <NmapTopologyView
              scan={currentScan}
              initialLayout="force"
              onSelectHost={(host) => setSelectedHost(host)}
              onUpdateHost={handleUpdateHost}
              customActions={customActions}
              customTabs={customDrawerTabs}
            />
          </div>
        )}

        {/* VIEW: CYBER THREAT HUNTER GAME */}
        {activeTab === 'game' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold text-rose-300 text-sm">
                  Interactive Incident Response Minigame
                </span>
              </div>
              <p className="text-zinc-400 font-mono text-[11px]">
                Powered entirely client-side via <code className="text-rose-400">packages/nastymap</code>
              </p>
            </div>
            <ThreatHuntGame />
          </div>
        )}

        {/* VIEW: GEO THREAT MAP */}
        {activeTab === 'geo' && (
          <div className="space-y-4">
            <NmapGeoMap scan={currentScan} onSelectHost={(host) => setSelectedHost(host)} />
          </div>
        )}

        {/* VIEW: SECURITY SCAN DIFF */}
        {activeTab === 'diff' && (
          <div className="space-y-4">
            <NmapDiffView
              scanA={parseNmapXml(SAMPLE_SCANS.breachDiff.xmlA)}
              scanB={parseNmapXml(SAMPLE_SCANS.breachDiff.xmlB)}
            />
          </div>
        )}

        {/* VIEW: HOST TABLE */}
        {activeTab === 'hosts' && (
          <div className="space-y-4">
            <HostTable scan={currentScan} onSelectHost={(host) => setSelectedHost(host)} />
          </div>
        )}

        {/* VIEW: SCAN STATS */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <NmapStats scan={currentScan} />
          </div>
        )}

        {/* VIEW: COMMAND VIEWER */}
        {activeTab === 'command' && (
          <div className="space-y-4">
            <NmapCommandViewer scan={currentScan} />
          </div>
        )}

        {/* VIEW: DOCS & PLAYGROUND */}
        {activeTab === 'docs' && (
          <div className="space-y-4">
            <DocsPlayground />
          </div>
        )}
      </main>

      {/* Host Detail Drawer (Inspector Modal) */}
      <HostDetailDrawer
        node={selectedNodeForDrawer}
        onClose={() => setSelectedHost(null)}
        onUpdateHost={handleUpdateHost}
        customActions={customActions}
        customTabs={customDrawerTabs}
      />

      {/* Upload XML Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-sky-400" />
                <h3 className="font-bold text-white text-base">Load Nmap XML Scan</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Drag and drop any raw <code className="text-sky-300">.xml</code> output generated from{' '}
              <code className="text-zinc-300">nmap -oX output.xml</code>. Parsing is performed 100% locally in your browser.
            </p>
            <ScanUploader onScanLoaded={handleScanLoaded} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/60 bg-zinc-950 px-6 py-6 text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-zinc-400 font-bold">NastyMap</span>
            <span>·</span>
            <span>Static Showcase & Cyber Threat Hunter</span>
            <span>·</span>
            <span>Hosted at tekromancy.github.io/nastymap</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/tekromancy/NastyMap"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>GitHub Repo</span>
              <ExternalLink size={12} />
            </a>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
