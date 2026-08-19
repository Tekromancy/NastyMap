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
  SAMPLE_SCANS,
} from 'nastymap';
import type { NmapHost, NmapRun, TopologyNode, HostAction, CustomDrawerTab } from 'nastymap';
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
  Zap,
} from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Update Host in-place
  const handleUpdateHost = (hostId: string, updater: (prev: NmapHost) => NmapHost | Partial<NmapHost>) => {
    setCurrentScan((prevScan) => {
      const updated = updateHostInScan(prevScan, hostId, updater);
      setSelectedHost((prev) => {
        if (!prev) return null;
        const matching = updated.hosts.find((h) => h.id === prev.id || h.ipv4 === prev.ipv4);
        return matching || prev;
      });
      return updated;
    });
  };

  // Define Custom Actions with Keyboard Shortcuts
  const customActions: HostAction[] = [
    {
      id: 'deep-scan',
      label: 'Deep Re-Scan',
      icon: <Sparkles size={14} className="text-amber-400" />,
      shortcut: 'd',
      variant: 'primary',
      tooltip: 'Execute deep service version & NSE vulnerability audit (Shortcut: D)',
      onClick: async (host, context) => {
        context.notify?.(`Running deep parallel audit (nmap -sV -sC -A -p-) on ${host.ipv4 || host.id}...`, 'info');

        // Simulate 750ms scan probe
        await new Promise((r) => setTimeout(r, 750));

        const newPortId = 8443;
        const existingPortIds = new Set(host.ports.map((p) => p.portid));
        const updatedPorts = [...host.ports];

        if (!existingPortIds.has(newPortId)) {
          updatedPorts.push({
            portid: newPortId,
            protocol: 'tcp',
            state: 'open',
            service: {
              name: 'https-alt',
              product: 'Admin Management REST API',
              version: 'v2.8.4-RELEASE',
              extrainfo: 'TLS 1.3 only; HTTP/2 enabled',
            },
            scripts: [
              {
                id: 'vulners',
                output: 'CVE-2023-48795 (Terrapin Attack) - CVSS 5.9 (MEDIUM Severity)',
              },
              {
                id: 'ssl-enum-ciphers',
                output: 'TLSv1.3: ECDHE-RSA-AES256-GCM-SHA384 (Strength: A+)',
              },
            ],
          });
        }

        const deepScripts = [
          ...(host.hostscripts || []),
          {
            id: 'nmap-vuln-audit',
            output: `Audit Timestamp: ${new Date().toISOString()}\nTarget Status: High Assurance Verified\nAuthentication Required: True\nExposed Endpoints: /api/v1/health, /metrics`,
          },
        ];

        context.updateHost((prev) => ({
          ports: updatedPorts,
          hostscripts: deepScripts,
          primaryOs: prev.primaryOs?.includes('(Verified)') ? prev.primaryOs : `${prev.primaryOs || 'Linux'} (Verified 100%)`,
          tags: Array.from(new Set([...(prev.tags || []), 'deep-scanned', 'audited'])),
          customData: {
            ...(prev.customData || {}),
            lastDeepScan: new Date().toLocaleTimeString(),
            vulnerabilityCount: 1,
          },
        }));

        context.notify?.(`✔ Deep audit completed for ${host.ipv4 || host.id}! Added port 8443 and NSE vulnerability data.`, 'success');
      },
    },
    {
      id: 'refresh-trace',
      label: 'Trace Refresh',
      icon: <Activity size={14} className="text-emerald-400" />,
      shortcut: 'r',
      variant: 'default',
      tooltip: 'Re-probe parallel traceroute hops and measure latest latency (Shortcut: R)',
      onClick: async (host, context) => {
        context.notify?.(`Re-probing network path to ${host.ipv4 || host.id}...`, 'info');
        await new Promise((r) => setTimeout(r, 400));

        const newLatency = Number((Math.random() * 8 + 0.8).toFixed(2));
        context.updateHost((prev) => ({
          latencyMs: newLatency,
          trace: prev.trace
            ? {
                ...prev.trace,
                hops: prev.trace.hops.map((hop) => ({
                  ...hop,
                  rtt: Number((hop.rtt ? hop.rtt * (0.8 + Math.random() * 0.4) : newLatency).toFixed(2)),
                })),
              }
            : undefined,
        }));
        context.notify?.(`Latency updated to ${newLatency}ms for ${host.ipv4 || host.id}`, 'success');
      },
    },
    {
      id: 'quarantine-host',
      label: 'Flag / Quarantine',
      icon: <Shield size={14} className="text-amber-400" />,
      shortcut: 'q',
      variant: 'warning',
      tooltip: 'Toggle host security quarantine state (Shortcut: Q)',
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
            ? `⚠️ Host ${host.ipv4 || host.id} placed in security QUARANTINE`
            : `Host ${host.ipv4 || host.id} quarantine released`,
          nextState ? 'warning' : 'info'
        );
      },
    },
  ];

  // Define Injected Custom Drawer Tabs
  const customDrawerTabs: CustomDrawerTab[] = [
    {
      id: 'cve-audit',
      label: '🛡️ Vulnerabilities',
      badge: (h) => (h.tags?.includes('deep-scanned') ? '1 Found' : undefined),
      render: (h, update) => (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs space-y-2">
            <div className="flex items-center justify-between text-rose-400 font-bold">
              <span>CVE-2023-48795 (Terrapin)</span>
              <span className="px-2 py-0.5 rounded bg-rose-900 text-rose-200 text-[10px]">CVSS 5.9 MEDIUM</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              General flaw in SSH protocol prefix truncation attack allowing extension negotiation manipulation.
            </p>
            <div className="pt-2 border-t border-rose-900/60 flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Remediation: Upgrade OpenSSH to &ge; 9.6p1</span>
              <button
                onClick={() =>
                  update((prev) => ({
                    comments: `${prev.comments || ''}\n[Remediation Logged: Patch CVE-2023-48795 on Next Maintenance Window]`.trim(),
                  }))
                }
                className="px-2.5 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-white font-medium transition-colors"
              >
                Log Remediation
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'diagnostics',
      label: '⚡ Live Diagnostics',
      render: (h) => (
        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">ICMP Echo RTT:</span>
              <span className="font-mono text-emerald-400 font-bold">{h.latencyMs || 1.2} ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Jitter (Standard Deviation):</span>
              <span className="font-mono text-zinc-200">&plusmn; 0.14 ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Packet Loss (10 probes):</span>
              <span className="font-mono text-emerald-400">0.0% (Clean)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">TCP SYN Handshake:</span>
              <span className="font-mono text-sky-400">0.82 ms</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#050811] text-zinc-100 font-sans flex items-center justify-center">
        <div className="flex items-center gap-3 text-sky-400 font-mono text-xs">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Initializing NastyMap Security Console...</span>
        </div>
      </div>
    );
  }

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
              <ChevronDown size={14} className="text-zinc-500" />
            </button>
            <div className="absolute right-0 mt-1 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50 animate-fade-in">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                Sample Scans
              </div>
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
          <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-400">Hosts:</span>
              <span className="font-bold text-white">{currentScan.hosts.length}</span>
            </div>
            <span className="text-zinc-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">Open Ports:</span>
              <span className="font-bold text-sky-400">{totalOpenPorts}</span>
            </div>
          </div>

          {/* Upload XML Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-900/30 flex items-center gap-1.5 transition-all"
          >
            <Upload size={14} />
            <span>Upload XML</span>
          </button>
        </div>
      </header>

      {/* Main Tabs Header */}
      <nav className="bg-zinc-950/60 border-b border-zinc-800/60 px-4 sm:px-6 pt-2 flex items-center gap-1 overflow-x-auto text-xs font-medium">
        {[
          { id: 'topology', label: 'Network Topology', icon: Network },
          { id: 'geo', label: 'Geo Threat Map', icon: Globe },
          { id: 'diff', label: 'Scan Diff & Incident', icon: GitCompare },
          { id: 'hosts', label: 'Host Directory', icon: Server },
          { id: 'stats', label: 'Security Analytics', icon: BarChart2 },
          { id: 'live', label: 'Live Scanner', icon: Terminal },
          { id: 'docs', label: 'Developer Docs', icon: BookOpen },
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
              onUpdateHost={handleUpdateHost}
              customActions={customActions}
              customTabs={customDrawerTabs}
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
              onUpdateHost={handleUpdateHost}
              customActions={customActions}
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
            <NmapTopologyView
              scan={currentScan}
              initialLayout="force"
              onUpdateHost={handleUpdateHost}
              customActions={customActions}
              customTabs={customDrawerTabs}
            />
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
        onUpdateHost={handleUpdateHost}
        customActions={customActions}
        customTabs={customDrawerTabs}
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
