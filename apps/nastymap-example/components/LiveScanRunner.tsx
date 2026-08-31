'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { NmapHost, NmapRun } from 'nastymap';
import { parseNmapXml, mergeScanResults, ENTERPRISE_NETWORK_XML, GLOBAL_PERIMETER_XML } from 'nastymap';
import {
  Play,
  Square,
  Terminal,
  CheckCircle2,
  Shield,
  Activity,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Radio,
  X,
  Info,
  Check,
  ShieldAlert,
  Network,
  Laptop,
  Filter,
  Zap,
  Layers,
  ChevronRight,
  Sliders,
} from 'lucide-react';

export interface NetworkInterfaceInfo {
  name: string;
  ip: string;
  netmask: string;
  prefixLength: number;
  networkCidr: string;
  networkIp: string;
  broadcast?: string;
  mac?: string;
  isInternal: boolean;
  family: 'IPv4' | 'IPv6';
  operstate?: string;
  suggestedCommands: {
    fastPingScan: string;
    fastPortScan: string;
    standardAudit: string;
    singleHostScan: string;
  };
}

export interface LiveScanRunnerProps {
  onScanCompleted: (scan: NmapRun, mode: 'simulated' | 'live', command: string) => void;
  className?: string;
}

export type ScanLayerId = 'ping' | 'ports' | 'services' | 'os_trace';

export interface ScanLayerState {
  id: ScanLayerId;
  name: string;
  desc: string;
  status: 'idle' | 'running' | 'completed' | 'skipped' | 'failed';
  summary?: string;
}

export function LiveScanRunner({ onScanCompleted, className = '' }: LiveScanRunnerProps) {
  const [scanMode, setScanMode] = useState<'simulated' | 'live'>('simulated');
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [acknowledgedWarning, setAcknowledgedWarning] = useState<boolean>(false);

  // Scan execution mode: 'progressive' (layered multi-stage) vs 'custom' (single command)
  const [scanExecutionStyle, setScanExecutionStyle] = useState<'progressive' | 'custom'>('progressive');

  const [targetSubnet, setTargetSubnet] = useState<string>('10.0.0.0/24');
  const [customCommand, setCustomCommand] = useState<string>('nmap -sS -sV -O -A --traceroute -T4 10.0.0.0/24');

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string>('Ready to scan');
  const [logs, setLogs] = useState<string[]>([
    'NastyMap Interactive Scanner Shell v1.0.0',
    'PROGRESSIVE SCANNING ENGINE: Multi-layer discovery avoids network timeouts and builds live topology step-by-step.',
  ]);

  // Streamed hosts accumulation
  const [streamedHosts, setStreamedHosts] = useState<NmapHost[]>([]);
  const [currentCumulativeScan, setCurrentCumulativeScan] = useState<NmapRun | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-detected Local Network Interfaces state
  const [interfaces, setInterfaces] = useState<NetworkInterfaceInfo[]>([]);
  const [isLoadingInterfaces, setIsLoadingInterfaces] = useState<boolean>(false);
  const [selectedInterface, setSelectedInterface] = useState<NetworkInterfaceInfo | null>(null);

  // Filter options
  const [excludeZeroPortHosts, setExcludeZeroPortHosts] = useState<boolean>(false);
  const [streamFilter, setStreamFilter] = useState<'all' | 'ping_up' | 'open_ports'>('all');

  // Progressive Layers State
  const [layers, setLayers] = useState<ScanLayerState[]>([
    { id: 'ping', name: 'Layer 1: Host Discovery', desc: 'Fast ping & ARP sweep across subnet', status: 'idle' },
    { id: 'ports', name: 'Layer 2: Fast Port Scan', desc: 'Top 100 ports on confirmed live hosts', status: 'idle' },
    { id: 'services', name: 'Layer 3: Service Banners', desc: 'Targeted fingerprinting on open ports', status: 'idle' },
    { id: 'os_trace', name: 'Layer 4: OS & Traceroute', desc: 'TCP/IP fingerprinting and route hops', status: 'idle' },
  ]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Fetch local network interfaces
  const fetchInterfaces = async () => {
    setIsLoadingInterfaces(true);
    try {
      const res = await fetch('/api/interfaces');
      if (res.ok) {
        const data = await res.json();
        if (data.interfaces && Array.isArray(data.interfaces)) {
          setInterfaces(data.interfaces);
          const firstExternal = data.interfaces.find((i: NetworkInterfaceInfo) => !i.isInternal);
          if (firstExternal) {
            setSelectedInterface(firstExternal);
            setTargetSubnet(firstExternal.networkCidr);
            setCustomCommand(`nmap -sV -F ${firstExternal.networkCidr}`);
          } else if (data.interfaces[0]) {
            setSelectedInterface(data.interfaces[0]);
            setTargetSubnet(data.interfaces[0].networkCidr);
          }
        }
      }
    } catch (e) {
      // Ignore interface fetch error gracefully
    } finally {
      setIsLoadingInterfaces(false);
    }
  };

  useEffect(() => {
    fetchInterfaces();
  }, []);

  // Handle switching modes
  const handleToggleMode = (targetMode: 'simulated' | 'live') => {
    if (targetMode === scanMode || isRunning) return;

    if (targetMode === 'live') {
      setShowWarningModal(true);
    } else {
      setScanMode('simulated');
      setTargetSubnet('10.0.0.0/24');
      setCustomCommand('nmap -sS -sV -O -A --traceroute -T4 10.0.0.0/24');
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Switched to SIMULATED mode (Safe mock scan data).`,
      ]);
    }
  };

  const handleConfirmLiveMode = () => {
    setAcknowledgedWarning(true);
    setShowWarningModal(false);
    setScanMode('live');

    const primaryNet = interfaces.find((i) => !i.isInternal);
    if (primaryNet) {
      setTargetSubnet(primaryNet.networkCidr);
      setCustomCommand(`nmap -sn ${primaryNet.networkCidr}`);
    } else {
      setTargetSubnet('scanme.nmap.org');
      setCustomCommand('nmap -sV -F scanme.nmap.org');
    }

    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ⚠️ LIVE SCAN MODE ENABLED: Real network packets will be transmitted.`,
      `[${new Date().toLocaleTimeString()}] Progressive scanning will discover live hosts first with ping, then probe ports on live targets only.`,
    ]);
  };

  const updateLayerStatus = (layerId: ScanLayerId, status: ScanLayerState['status'], summary?: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, status, summary: summary || l.summary } : l))
    );
  };

  // Helper to execute a single Nmap command and return parsed scan
  const executeSingleNmapCommand = async (cmd: string, signal: AbortSignal): Promise<NmapRun | null> => {
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ─── Executing: ${cmd} ───`,
    ]);

    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd }),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    if (!response.body) throw new Error('No stream body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let receivedXml = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.type === 'stdout' && event.line) {
            setLogs((prev) => [...prev, event.line]);
          } else if (event.type === 'stderr' && event.line) {
            setLogs((prev) => [...prev, `[STDERR] ${event.line}`]);
          } else if (event.type === 'error' && event.error) {
            setLogs((prev) => [...prev, `[ERROR] ${event.error}`]);
          } else if (event.type === 'done' && event.xml) {
            receivedXml = event.xml;
          }
        } catch {
          setLogs((prev) => [...prev, line]);
        }
      }
    }

    if (receivedXml) {
      return parseNmapXml(receivedXml);
    }
    return null;
  };

  // RUN PROGRESSIVE LAYERED LIVE SCAN
  const handleStartProgressiveLiveScan = async () => {
    setIsRunning(true);
    setProgress(5);
    setStreamedHosts([]);
    setCurrentCumulativeScan(null);

    // Reset layers
    setLayers([
      { id: 'ping', name: 'Layer 1: Host Discovery', desc: 'Fast ping & ARP sweep across subnet', status: 'running' },
      { id: 'ports', name: 'Layer 2: Fast Port Scan', desc: 'Top 100 ports on confirmed live hosts', status: 'idle' },
      { id: 'services', name: 'Layer 3: Service Banners', desc: 'Targeted fingerprinting on open ports', status: 'idle' },
      { id: 'os_trace', name: 'Layer 4: OS & Traceroute', desc: 'TCP/IP fingerprinting and route hops', status: 'idle' },
    ]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const target = targetSubnet.trim() || '127.0.0.1';
    let cumulativeScan: NmapRun | null = null;

    try {
      // ════════════════════════════════════════════════════════════════════
      // LAYER 1: Host Discovery (Ping Sweep)
      // ════════════════════════════════════════════════════════════════════
      setCurrentPhase('Layer 1/4: Discovering live hosts across subnet (Ping Sweep)...');
      setProgress(15);

      const layer1Cmd = `nmap -sn -T4 ${target}`;
      const l1Scan = await executeSingleNmapCommand(layer1Cmd, abortController.signal);

      if (!l1Scan || l1Scan.hosts.length === 0) {
        updateLayerStatus('ping', 'failed', 'No responsive hosts found');
        throw new Error(`Host discovery returned 0 live hosts for target: ${target}`);
      }

      const liveHosts = l1Scan.hosts.filter((h) => h.status.state === 'up');
      const liveIps = liveHosts.map((h) => h.ipv4 || h.id).filter(Boolean);

      updateLayerStatus('ping', 'completed', `${liveIps.length} live hosts discovered`);
      cumulativeScan = l1Scan;
      setCurrentCumulativeScan(cumulativeScan);
      setStreamedHosts(cumulativeScan.hosts);
      onScanCompleted(cumulativeScan, 'live', `Layer 1 (Ping): ${target}`);

      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✔ Layer 1 Complete: Found ${liveIps.length} responsive host(s): ${liveIps.join(', ')}`,
        `[${new Date().toLocaleTimeString()}] Network topology updated with live hosts!`,
      ]);

      if (liveIps.length === 0) {
        setIsRunning(false);
        return;
      }

      // ════════════════════════════════════════════════════════════════════
      // LAYER 2: Fast Port Scan on Live Hosts Only
      // ════════════════════════════════════════════════════════════════════
      updateLayerStatus('ports', 'running');
      setCurrentPhase(`Layer 2/4: Scanning ports on ${liveIps.length} confirmed live host(s)...`);
      setProgress(40);

      // Probe top 100 fast ports on confirmed live IPs only (avoids scanning hundreds of non-existent hosts!)
      const layer2Cmd = `nmap -sT -F -T4 ${liveIps.join(' ')}`;
      const l2Scan = await executeSingleNmapCommand(layer2Cmd, abortController.signal);

      if (l2Scan) {
        cumulativeScan = mergeScanResults(cumulativeScan, l2Scan);
        setCurrentCumulativeScan(cumulativeScan);
        setStreamedHosts(cumulativeScan.hosts);
        onScanCompleted(cumulativeScan, 'live', `Layer 2 (Ports): ${target}`);

        const totalOpenPorts = cumulativeScan.hosts.reduce(
          (acc, h) => acc + h.ports.filter((p) => p.state === 'open').length,
          0
        );
        updateLayerStatus('ports', 'completed', `${totalOpenPorts} open ports discovered`);
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✔ Layer 2 Complete: Mapped ${totalOpenPorts} open port(s) across live hosts.`,
        ]);
      } else {
        updateLayerStatus('ports', 'skipped', 'No port data returned');
      }

      // ════════════════════════════════════════════════════════════════════
      // LAYER 3: Targeted Service & Version Detection
      // ════════════════════════════════════════════════════════════════════
      const hostsWithOpenPorts = cumulativeScan.hosts.filter((h) =>
        h.ports.some((p) => p.state === 'open')
      );
      const targetIpsForServices = hostsWithOpenPorts.map((h) => h.ipv4 || h.id).filter(Boolean);

      if (targetIpsForServices.length > 0) {
        updateLayerStatus('services', 'running');
        setCurrentPhase(`Layer 3/4: Probing service versions on ${targetIpsForServices.length} host(s) with open ports...`);
        setProgress(70);

        // Targeted service probe with --version-light -T4 to prevent hanging on embedded/slow services
        const layer3Cmd = `nmap -sV --version-light -T4 ${targetIpsForServices.join(' ')}`;
        const l3Scan = await executeSingleNmapCommand(layer3Cmd, abortController.signal);

        if (l3Scan) {
          cumulativeScan = mergeScanResults(cumulativeScan, l3Scan);
          setCurrentCumulativeScan(cumulativeScan);
          setStreamedHosts(cumulativeScan.hosts);
          onScanCompleted(cumulativeScan, 'live', `Layer 3 (Services): ${target}`);
          updateLayerStatus('services', 'completed', 'Service banners identified');
          setLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ✔ Layer 3 Complete: Service products and versions fingerprinted.`,
          ]);
        } else {
          updateLayerStatus('services', 'skipped', 'Service probe completed without changes');
        }
      } else {
        updateLayerStatus('services', 'skipped', 'No open ports to probe for services');
      }

      // ════════════════════════════════════════════════════════════════════
      // LAYER 4: OS & Traceroute Detection
      // ════════════════════════════════════════════════════════════════════
      const targetIpsForOs = (targetIpsForServices.length > 0 ? targetIpsForServices : liveIps).slice(0, 5); // Limit OS detection to first 5 for speed
      updateLayerStatus('os_trace', 'running');
      setCurrentPhase(`Layer 4/4: Traceroute & OS matching on ${targetIpsForOs.length} target(s)...`);
      setProgress(90);

      const layer4Cmd = `nmap -O --osscan-limit --traceroute -T4 ${targetIpsForOs.join(' ')}`;
      const l4Scan = await executeSingleNmapCommand(layer4Cmd, abortController.signal);

      if (l4Scan) {
        cumulativeScan = mergeScanResults(cumulativeScan, l4Scan);
        setCurrentCumulativeScan(cumulativeScan);
        setStreamedHosts(cumulativeScan.hosts);
        onScanCompleted(cumulativeScan, 'live', `Layer 4 (Full Audit): ${target}`);
        updateLayerStatus('os_trace', 'completed', 'OS and routes mapped');
      } else {
        updateLayerStatus('os_trace', 'skipped', 'OS scan finished');
      }

      setProgress(100);
      setCurrentPhase('Progressive Multi-Layer Scan Completed Successfully');
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ═══════════════════════════════════════════════`,
        `[${new Date().toLocaleTimeString()}] 🎉 ALL SCAN LAYERS COMPLETED SUCCESSFULLY!`,
        `[${new Date().toLocaleTimeString()}] Live topology and security metrics are fully populated.`,
      ]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Scan stopped by user. Previous completed layers were preserved in the topology map!`,
        ]);
        setCurrentPhase('Scan Stopped (Partial Layers Preserved)');
      } else {
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Execution Notice: ${err.message}`,
        ]);
        setCurrentPhase('Layer Execution Interrupted');
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  // Run Custom Single Command Live Scan
  const handleStartCustomLiveScan = async () => {
    setIsRunning(true);
    setProgress(20);
    setStreamedHosts([]);
    setCurrentPhase('Executing custom Nmap command...');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const scan = await executeSingleNmapCommand(customCommand, abortController.signal);
      if (scan) {
        setProgress(100);
        setCurrentPhase('Custom Scan Completed');
        setStreamedHosts(scan.hosts);
        onScanCompleted(scan, 'live', customCommand);
      } else {
        setCurrentPhase('Scan finished without XML output');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setCurrentPhase('Scan Cancelled');
      } else {
        setCurrentPhase(`Error: ${err.message}`);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  // Run Simulated Scan
  const handleStartSimulatedScan = () => {
    setIsRunning(true);
    setProgress(0);
    setStreamedHosts([]);
    setLogs([
      `[${new Date().toLocaleTimeString()}] [SIMULATED] Starting Nmap 7.94 ( https://nmap.org )`,
      `[${new Date().toLocaleTimeString()}] Target: ${targetSubnet}`,
    ]);

    const sourceXml =
      targetSubnet.includes('global') || targetSubnet.includes('1.1.1.1') || targetSubnet.includes('8.8.8.8')
        ? GLOBAL_PERIMETER_XML
        : ENTERPRISE_NETWORK_XML;

    const fullScan = parseNmapXml(sourceXml);
    const totalHosts = fullScan.hosts.length;

    const phases = [
      { p: 25, name: 'Layer 1: Initiating Ping Discovery Sweep', log: 'Ping probe sent to subnet addresses...' },
      { p: 50, name: 'Layer 2: Initiating Parallel SYN Stealth Scan', log: 'Scanning ports on discovered live hosts...' },
      { p: 75, name: 'Layer 3: Initiating Service & Version Detection', log: 'Probing open ports for banners...' },
      { p: 95, name: 'Layer 4: Matching OS Fingerprints & Traceroute', log: 'Tracing route hops and latency...' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < phases.length) {
        const ph = phases[currentStep];
        setProgress(ph.p);
        setCurrentPhase(ph.name);
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${ph.log}`]);
        const hostsToShow = fullScan.hosts.slice(0, Math.ceil((currentStep / phases.length) * totalHosts));
        setStreamedHosts(hostsToShow);
      } else {
        clearInterval(interval);
        setProgress(100);
        setCurrentPhase('Simulated Scan Completed Successfully');
        setStreamedHosts(fullScan.hosts);
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Nmap done: ${totalHosts} hosts scanned in 3.4 seconds.`,
        ]);
        setIsRunning(false);
        onScanCompleted(fullScan, 'simulated', customCommand);
      }
    }, 800);
  };

  const handleStopScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
  };

  const handleRun = () => {
    if (isRunning) return;
    if (scanMode === 'simulated') {
      handleStartSimulatedScan();
    } else if (scanExecutionStyle === 'progressive') {
      handleStartProgressiveLiveScan();
    } else {
      handleStartCustomLiveScan();
    }
  };

  // Filtered streamed hosts for UI
  const visibleStreamedHosts = useMemo(() => {
    if (streamFilter === 'open_ports') {
      const withPorts = streamedHosts.filter((h) => h.ports.some((p) => p.state === 'open'));
      return withPorts.length > 0 ? withPorts : streamedHosts;
    }
    if (streamFilter === 'ping_up') {
      const upOnly = streamedHosts.filter((h) => h.status.state === 'up');
      return upOnly.length > 0 ? upOnly : streamedHosts;
    }
    return streamedHosts;
  }, [streamedHosts, streamFilter]);

  const hostsWithPortsCount = useMemo(() => {
    return streamedHosts.filter((h) => h.ports.some((p) => p.state === 'open')).length;
  }, [streamedHosts]);

  const hostsUpCount = useMemo(() => {
    return streamedHosts.filter((h) => h.status.state === 'up').length;
  }, [streamedHosts]);

  return (
    <div className={`p-6 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 space-y-5 ${className}`}>
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Terminal size={20} className={scanMode === 'live' ? 'text-rose-400' : 'text-sky-400'} />
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Nmap Layered Scan Engine</span>
              {scanMode === 'live' && (
                <span className="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 font-mono text-[10px] font-bold border border-rose-800 flex items-center gap-1">
                  <Radio size={10} className="text-rose-400 animate-ping" />
                  REAL LIVE NETWORK
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400 font-mono">
              {scanMode === 'live'
                ? 'Progressive multi-stage scanning prevents timeouts on large subnets'
                : 'Deterministic multi-phase simulation for demo & topology preview'}
            </p>
          </div>
        </div>

        {/* Toggle Mode Button Group */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold">
            <button
              onClick={() => handleToggleMode('simulated')}
              disabled={isRunning}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                scanMode === 'simulated'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles size={13} />
              <span>Simulated</span>
            </button>
            <button
              onClick={() => handleToggleMode('live')}
              disabled={isRunning}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                scanMode === 'live'
                  ? 'bg-rose-600 text-white shadow animate-pulse'
                  : 'text-zinc-400 hover:text-rose-400'
              }`}
            >
              <Radio size={13} />
              <span>Live (Real Nmap)</span>
            </button>
          </div>

          {/* Status Indicator */}
          <div>
            {isRunning ? (
              <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-xs font-semibold border ${
                scanMode === 'live'
                  ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                  : 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse'
              }`}>
                <Activity size={13} />
                <span>Scanning...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950 text-emerald-400 font-mono text-xs font-semibold border border-emerald-800">
                <CheckCircle2 size={13} />
                <span>Ready</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Live Mode Warning Notice Banner */}
      {scanMode === 'live' && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/70 text-xs flex items-start justify-between gap-3 text-rose-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-300">
                Live Scan Mode Active — Real Network Probes
              </p>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Packets are being sent directly over your network interface. Only target hosts you own or have explicit written permission to audit. Unauthorized port scanning can trigger firewall bans or violate network usage policies.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggleMode('simulated')}
            disabled={isRunning}
            className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-[11px] font-mono text-rose-100 border border-rose-700 shrink-0 transition-colors"
          >
            Switch to Simulated
          </button>
        </div>
      )}

      {/* AUTO-DETECTED LOCAL NETWORK INTERFACES & SUBNETS */}
      {scanMode === 'live' && (
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
              <Network size={15} className="text-sky-400" />
              <span>Auto-Detected Local Interfaces & Target Subnets</span>
            </div>
            <button
              onClick={fetchInterfaces}
              disabled={isLoadingInterfaces}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono text-zinc-300 flex items-center gap-1.5 transition-colors"
              title="Refresh network interfaces"
            >
              <RefreshCw size={11} className={isLoadingInterfaces ? 'animate-spin text-sky-400' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {interfaces.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {interfaces.map((iface) => {
                const isSelected = targetSubnet === iface.networkCidr;
                return (
                  <div
                    key={`${iface.name}-${iface.ip}`}
                    onClick={() => {
                      setTargetSubnet(iface.networkCidr);
                      setCustomCommand(`nmap -sn ${iface.networkCidr}`);
                    }}
                    className={`p-3 rounded-xl border transition-all text-xs font-mono space-y-2 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-950/70 border-sky-500 shadow-md shadow-sky-900/30'
                        : iface.isInternal
                        ? 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                        : 'bg-zinc-950/90 border-zinc-800 hover:border-sky-700 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          isSelected ? 'bg-sky-500 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {iface.name}
                        </span>
                        <span className="font-bold text-white text-sm">{iface.networkCidr}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {isSelected ? '✓ Selected Target' : 'Click to Select'}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                      <span>Host IP: <strong className="text-emerald-400">{iface.ip}</strong></span>
                      <span>Mask: <span className="text-zinc-500">{iface.netmask}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SCAN STYLE SWITCHER: Progressive Layered vs Custom */}
      {scanMode === 'live' && (
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs font-semibold">
          <span className="text-zinc-400 font-mono">Scan Style:</span>
          <button
            onClick={() => setScanExecutionStyle('progressive')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              scanExecutionStyle === 'progressive'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Layers size={13} />
            <span>Progressive Layered Scan (Recommended)</span>
          </button>
          <button
            onClick={() => setScanExecutionStyle('custom')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              scanExecutionStyle === 'custom'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Terminal size={13} />
            <span>Custom Raw Command</span>
          </button>
        </div>
      )}

      {/* PROGRESSIVE SCAN LAYER STEPPER */}
      {scanExecutionStyle === 'progressive' && (
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Layers size={14} className="text-sky-400" />
              <span>Multi-Layer Progressive Scan Pipeline</span>
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              Target: <strong className="text-sky-300">{targetSubnet}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {layers.map((layer, idx) => {
              const isLayerRunning = layer.status === 'running';
              const isLayerDone = layer.status === 'completed';
              const isLayerSkipped = layer.status === 'skipped';
              const isLayerFailed = layer.status === 'failed';

              return (
                <div
                  key={layer.id}
                  className={`p-3 rounded-xl border text-xs font-mono space-y-1.5 transition-all ${
                    isLayerRunning
                      ? 'bg-sky-950/80 border-sky-500 shadow-md shadow-sky-900/30'
                      : isLayerDone
                      ? 'bg-emerald-950/40 border-emerald-800/80'
                      : isLayerFailed
                      ? 'bg-rose-950/40 border-rose-800/80'
                      : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      {isLayerDone ? (
                        <CheckCircle2 size={13} className="text-emerald-400" />
                      ) : isLayerRunning ? (
                        <RefreshCw size={13} className="text-sky-400 animate-spin" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                      )}
                      <span>{layer.name}</span>
                    </span>
                  </div>

                  <p className="text-[10.5px] text-zinc-400 leading-tight">{layer.desc}</p>

                  {layer.summary && (
                    <div className="pt-1 text-[10px] font-bold text-emerald-400 border-t border-zinc-800/60 truncate">
                      {layer.summary}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Target & Command Input Bar */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {scanExecutionStyle === 'progressive' ? (
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-2.5 font-mono font-bold text-sm text-sky-400 select-none">
                Target:
              </span>
              <input
                type="text"
                value={targetSubnet}
                onChange={(e) => setTargetSubnet(e.target.value)}
                disabled={isRunning}
                placeholder="10.46.48.0/24, 192.168.1.0/24, or scanme.nmap.org"
                className="w-full pl-20 pr-4 py-2.5 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-sky-300 placeholder-zinc-600 focus:outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>
          ) : (
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-2.5 font-mono font-bold text-sm text-rose-400 select-none">
                $
              </span>
              <input
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                disabled={isRunning}
                placeholder="nmap -sV -F 10.46.48.0/24"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-rose-300 placeholder-zinc-600 focus:outline-none focus:border-rose-500 disabled:opacity-60"
              />
            </div>
          )}

          {isRunning ? (
            <button
              onClick={handleStopScan}
              className="px-6 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold shadow transition-colors flex items-center gap-2"
            >
              <Square size={14} />
              <span>Stop Pipeline</span>
            </button>
          ) : (
            <button
              onClick={handleRun}
              className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow transition-all flex items-center gap-2 ${
                scanMode === 'live'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'
                  : 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/40'
              }`}
            >
              <Play size={14} />
              <span>{scanExecutionStyle === 'progressive' ? 'Run Layered Pipeline' : 'Run Scan'}</span>
            </button>
          )}
        </div>

        {/* Quick Presets for Target */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="text-zinc-500">Quick Targets:</span>
          {interfaces.map((i) => (
            <button
              key={i.name}
              onClick={() => {
                setTargetSubnet(i.networkCidr);
                setCustomCommand(`nmap -sn ${i.networkCidr}`);
              }}
              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-sky-400 border border-zinc-800 transition-colors"
            >
              {i.name} ({i.networkCidr})
            </button>
          ))}
          <button
            onClick={() => {
              setTargetSubnet('scanme.nmap.org');
              setCustomCommand('nmap -sV -F scanme.nmap.org');
            }}
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 transition-colors"
          >
            scanme.nmap.org (Testbed)
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300 flex items-center gap-2">
            {isRunning && <RefreshCw size={12} className="animate-spin text-sky-400" />}
            <span>{currentPhase}</span>
          </span>
          <span className={`font-mono font-bold ${scanMode === 'live' ? 'text-rose-400' : 'text-sky-400'}`}>
            {progress}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              scanMode === 'live'
                ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-400'
                : 'bg-gradient-to-r from-sky-500 to-emerald-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Real-time Streaming Host Cards */}
      {visibleStreamedHosts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Discovered Live Nodes ({visibleStreamedHosts.length}
              {streamedHosts.length > visibleStreamedHosts.length ? ` / ${streamedHosts.length} total` : ''}):
            </span>

            {/* Filter Tabs */}
            <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[10.5px] font-mono">
              <button
                onClick={() => setStreamFilter('all')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  streamFilter === 'all' ? 'bg-sky-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All ({streamedHosts.length})
              </button>
              <button
                onClick={() => setStreamFilter('ping_up')}
                className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                  streamFilter === 'ping_up' ? 'bg-emerald-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Radio size={9} />
                <span>Ping Up ({hostsUpCount})</span>
              </button>
              <button
                onClick={() => setStreamFilter('open_ports')}
                className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                  streamFilter === 'open_ports' ? 'bg-amber-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Shield size={9} />
                <span>With Ports ({hostsWithPortsCount})</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {visibleStreamedHosts.map((h) => {
              const openPorts = h.ports.filter((p) => p.state === 'open');
              const isUp = h.status.state === 'up';
              return (
                <div
                  key={h.id}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono flex items-center gap-2 animate-fade-in"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      openPorts.length > 0 ? 'bg-emerald-400' : isUp ? 'bg-sky-400' : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-bold text-white">{h.ipv4 || h.id}</span>
                  {h.primaryHostname && <span className="text-zinc-400">({h.primaryHostname})</span>}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      openPorts.length > 0
                        ? 'bg-sky-950 text-sky-400 border border-sky-800/40'
                        : isUp
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {openPorts.length > 0 ? `${openPorts.length} ports` : isUp ? 'Ping Up' : 'Down'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Console Output Log */}
      <div
        ref={logContainerRef}
        className="p-4 rounded-xl bg-black/90 border border-zinc-800 font-mono text-[11px] text-zinc-300 h-48 overflow-y-auto space-y-1 select-text scroll-smooth"
      >
        {logs.map((line, idx) => (
          <div
            key={idx}
            className={`leading-relaxed ${
              line.startsWith('[ERROR]') || line.includes('Failed')
                ? 'text-rose-400'
                : line.startsWith('[STDERR]')
                ? 'text-amber-400'
                : line.includes('✔') || line.includes('Complete') || line.includes('SUCCESSFULLY')
                ? 'text-emerald-400 font-semibold'
                : line.startsWith('───')
                ? 'text-sky-400 font-bold'
                : 'text-zinc-300'
            }`}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Warning Confirmation Modal when toggling from Simulated to Live */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-rose-800/80 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-700/60 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldAlert size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Enable Live Network Scanning?</span>
                </h3>
                <p className="text-xs text-rose-300 font-mono">
                  Authorization & Network Risk Acknowledgment
                </p>
              </div>
            </div>

            {/* Warning Message Body */}
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/60 text-xs text-zinc-300 space-y-3 leading-relaxed">
              <p className="font-semibold text-rose-200">
                ⚠️ Real port scanning sends actual network probes across target infrastructure.
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-zinc-300 text-[11.5px]">
                <li>
                  <strong className="text-rose-300">Network Bans & Blocklists:</strong> Scanning unauthorized networks can trigger automated Intrusion Detection Systems (IDS/IPS) and result in permanent firewall or IP bans.
                </li>
                <li>
                  <strong className="text-rose-300">Legal & Policy Implications:</strong> Port scanning third-party networks without explicit consent may violate Acceptable Use Policies (AUP) or computer security regulations.
                </li>
                <li>
                  <strong className="text-emerald-300">Authorized Testing:</strong> Only scan networks, subnets, or servers you own or have verified permission to audit, or use authorized testbeds like <code className="text-sky-300 font-mono">scanme.nmap.org</code> or your local subnet CIDR.
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-colors"
              >
                Cancel (Stay in Simulation)
              </button>
              <button
                onClick={handleConfirmLiveMode}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition-colors flex items-center gap-2"
              >
                <Radio size={14} />
                <span>I Understand, Enable Live Scan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
