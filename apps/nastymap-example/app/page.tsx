'use client';

import React, { useState } from 'react';
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
  SAMPLE_SCANS,
} from 'nastymap';
import type { NmapHost, NmapRun, TopologyNode } from 'nastymap';
import { LiveScanRunner } from '../components/LiveScanRunner';
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
  Layers,
  Sparkles,
  ChevronDown,
  Activity,
  X,
} from 'lucide-react';

export default function Home() {
  // Current active scan
  const [currentScan, setCurrentScan] = useState<NmapRun>(() => {
    return parseNmapXml(SAMPLE_SCANS.enterprise.xml);
  });
  const [activeScanLabel, setActiveScanLabel] = useState<string>(SAMPLE_SCANS.enterprise.name);

  // Active view tab
  const [activeTab, setActiveTab] = useState<
    'topology' | 'geo' | 'diff' | 'hosts' | 'stats' | 'live' | 'docs'
  >('topology');

  // Selected Host across tabs
  const [selectedHost, setSelectedHost] = useState<NmapHost | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  // Host detail drawer for table/geo view
  const selectedNodeForDrawer: TopologyNode | null = selectedHost
    ? {
        id: selectedHost.ipv4 || selectedHost.id,
        label: selectedHost.primaryHostname || selectedHost.ipv4 || selectedHost.id,
        ip: selectedHost.ipv4 || selectedHost.id,
        hostname: selectedHost.primaryHostname,
        nodeType: selectedHost.deviceType === 'router' ? 'router' : 'host',
        status: selectedHost.status.state === 'up' ? 'up' : 'down',
        osFamily: selectedHost.osFamily || 'Unknown',
        osName: selectedHost.primaryOs || 'Unknown OS',
        deviceType: selectedHost.deviceType || 'general purpose',
        openPorts: selectedHost.ports.filter((p) => p.state === 'open').map((p) => p.portid),
        openPortDetails: selectedHost.ports.filter((p) => p.state === 'open'),
        latencyMs: selectedHost.latencyMs,
        hopsAway: selectedHost.distance || 1,
        subnet: selectedHost.ipv4 ? `${selectedHost.ipv4.split('.').slice(0, 3).join('.')}.0/24` : 'Other',
        hostRef: selectedHost,
        geolocation: selectedHost.geolocation,
        x: 0,
        y: 0,
        radius: 20,
      }
    : null;

  const handleSelectSample = (sampleKey: 'enterprise' | 'global' | 'breachDiff') => {
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

  return (
    <div className="min-h-screen bg-[#050811] text-zinc-100 font-sans flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3.5">
          {/* Logo */}
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
            </div>
            <p className="text-[11px] text-zinc-400 font-mono hidden sm:block">
              Nmap Graphical Topology & Threat Map Platform
            </p>
          </div>
        </div>

        {/* Scan Info & Controls */}
        <div className="flex items-center gap-3">
          {/* Preset Selector Dropdown */}
          <div className="relative group hidden md:block">
            <button className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-2 transition-colors">
              <Sparkles size={14} className="text-amber-400" />
              <span className="truncate max-w-[200px]">{activeScanLabel}</span>
              <ChevronDown size={13} className="text-zinc-500" />
            </button>

            <div className="absolute right-0 mt-1 w-64 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 hidden group-hover:block z-50 text-xs space-y-1">
              <button
                onClick={() => handleSelectSample('enterprise')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-white block">Enterprise Multi-Subnet</span>
                  <span className="text-[10px] text-zinc-400">Traceroute & mixed OS</span>
                </div>
              </button>
              <button
                onClick={() => handleSelectSample('global')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-emerald-400 block">Global Cloud Perimeter</span>
                  <span className="text-[10px] text-zinc-400">Public IP GeoIP World Map</span>
                </div>
              </button>
              <button
                onClick={() => handleSelectSample('breachDiff')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-rose-400 block">Security Incident Diff</span>
                  <span className="text-[10px] text-zinc-400">Before & after backdoor diff</span>
                </div>
              </button>
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <Upload size={14} className="text-sky-400" />
            <span>Load XML</span>
          </button>
        </div>
      </header>

      {/* Live Scan Overview Bar */}
      <section aria-label="Scan Statistics" className="bg-zinc-900/40 border-b border-zinc-800/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white font-mono">{currentScan.hosts.length} Hosts</span>
            <span className="text-zinc-500">
              ({currentScan.hosts.filter((h) => h.status.state === 'up').length} online)
            </span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-4">
            <Shield size={13} className="text-sky-400" />
            <span className="font-mono text-zinc-300 font-semibold">{totalOpenPorts} Open Services</span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-4 text-zinc-400 font-mono text-[11px] hidden lg:flex">
            <Terminal size={12} />
            <span className="truncate max-w-sm">{currentScan.args}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[11px]">
            {currentScan.startstr}
          </span>
        </div>
      </section>

      {/* Main Navigation Tabs */}
      <nav aria-label="Main View" className="border-b border-zinc-800 bg-zinc-950/60 px-4 sm:px-6 pt-2 flex items-center gap-1 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'topology', label: 'Network Topology', icon: Network },
          { id: 'geo', label: 'Geo Threat Map', icon: Globe },
          { id: 'diff', label: 'Scan Diff & Changes', icon: GitCompare },
          { id: 'hosts', label: `Host Directory (${currentScan.hosts.length})`, icon: Server },
          { id: 'stats', label: 'Security Analytics', icon: BarChart2 },
          { id: 'live', label: 'Live Scanner Terminal', icon: Terminal },
          { id: 'docs', label: 'Developer Library & API', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-t-xl border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-sky-500 bg-zinc-900/80 text-sky-400 font-bold shadow-sm'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Content Body */}
      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* TOPOLOGY VIEW */}
        {activeTab === 'topology' && (
          <div className="space-y-6">
            <NmapTopologyView
              scan={currentScan}
              initialLayout="force"
              onSelectHost={(host) => setSelectedHost(host)}
            />
            <NmapCommandViewer scan={currentScan} />
          </div>
        )}

        {/* GEO THREAT MAP */}
        {activeTab === 'geo' && (
          <div className="space-y-6">
            <NmapGeoMap
              scan={currentScan}
              onSelectHost={(host) => setSelectedHost(host)}
            />
            <NmapCommandViewer scan={currentScan} />
          </div>
        )}

        {/* SCAN DIFF & COMPARISON */}
        {activeTab === 'diff' && (
          <div className="space-y-6">
            <NmapDiffView />
          </div>
        )}

        {/* HOST DIRECTORY TABLE */}
        {activeTab === 'hosts' && (
          <div className="space-y-6">
            <HostTable
              scan={currentScan}
              onSelectHost={(host) => setSelectedHost(host)}
            />
          </div>
        )}

        {/* SECURITY ANALYTICS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <NmapStats scan={currentScan} />
            <NmapCommandViewer scan={currentScan} />
          </div>
        )}

        {/* LIVE SCAN RUNNER */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            <LiveScanRunner
              onScanCompleted={(newScan) => {
                setCurrentScan(newScan);
                setActiveScanLabel('Live Simulated Scan');
              }}
            />
            <NmapTopologyView scan={currentScan} initialLayout="force" />
          </div>
        )}

        {/* DEVELOPER PLAYGROUND & DOCS */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <DocsPlayground />
          </div>
        )}
      </main>

      {/* Host Detail Drawer for global selection */}
      <HostDetailDrawer
        node={selectedNodeForDrawer}
        onClose={() => setSelectedHost(null)}
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
            <ScanUploader onScanLoaded={handleScanLoaded} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/60 bg-zinc-950 px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 font-mono">
        <div className="flex items-center gap-2">
          <span>NastyMap — The Nmap Network Topology & Geolocation Visualizer</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveTab('docs')} className="hover:text-sky-400 transition-colors">
            Library Docs
          </button>
          <span>·</span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  );
}
