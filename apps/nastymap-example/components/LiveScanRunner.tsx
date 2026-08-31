'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { NmapHost, NmapRun } from 'nastymap';
import { parseNmapXml, ENTERPRISE_NETWORK_XML, GLOBAL_PERIMETER_XML } from 'nastymap';
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

export function LiveScanRunner({ onScanCompleted, className = '' }: LiveScanRunnerProps) {
  const [scanMode, setScanMode] = useState<'simulated' | 'live'>('simulated');
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [acknowledgedWarning, setAcknowledgedWarning] = useState<boolean>(false);

  const [command, setCommand] = useState('nmap -sS -sV -O -A --traceroute -T4 10.0.0.0/24');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string>('Ready to scan');
  const [logs, setLogs] = useState<string[]>([
    'NastyMap Interactive Scanner Shell v1.0.0',
    'MODE: [SIMULATED] — Use toggle above to switch to Live Nmap network scanning.',
    'Type target IP, subnet or hostname to execute parallel scan.',
  ]);
  const [streamedHosts, setStreamedHosts] = useState<NmapHost[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-detected Local Network Interfaces state
  const [interfaces, setInterfaces] = useState<NetworkInterfaceInfo[]>([]);
  const [isLoadingInterfaces, setIsLoadingInterfaces] = useState<boolean>(false);
  const [selectedInterface, setSelectedInterface] = useState<NetworkInterfaceInfo | null>(null);

  // Filter option: Exclude zero-port hosts (for port scans) vs keep ping-responsive
  const [excludeZeroPortHosts, setExcludeZeroPortHosts] = useState<boolean>(true);
  const [streamFilter, setStreamFilter] = useState<'open_ports' | 'ping_up' | 'all'>('all');

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
          } else if (data.interfaces[0]) {
            setSelectedInterface(data.interfaces[0]);
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
      setCommand('nmap -sS -sV -O -A --traceroute -T4 10.0.0.0/24');
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
      setCommand(`nmap -sV -F ${primaryNet.networkCidr}`);
    } else {
      setCommand('nmap -sV -F scanme.nmap.org');
    }

    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ⚠️ LIVE SCAN MODE ENABLED: Real network packets will be transmitted.`,
      `[${new Date().toLocaleTimeString()}] Auto-detected ${interfaces.length} interface(s) on host. Select a subnet below to populate command.`,
    ]);
  };

  // Run Simulated Scan
  const handleStartSimulatedScan = () => {
    setIsRunning(true);
    setProgress(0);
    setStreamedHosts([]);
    setLogs([
      `[${new Date().toLocaleTimeString()}] [SIMULATED] Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toUTCString()}`,
      `[${new Date().toLocaleTimeString()}] Executing: ${command}`,
    ]);

    const sourceXml =
      command.includes('global') || command.includes('1.1.1.1') || command.includes('8.8.8.8')
        ? GLOBAL_PERIMETER_XML
        : ENTERPRISE_NETWORK_XML;

    const fullScan = parseNmapXml(sourceXml);
    const totalHosts = fullScan.hosts.length;

    // Simulation steps
    const phases = [
      { p: 15, name: 'Initiating ARP / ICMP Ping Scan', log: 'ARP discovery probe sent to 256 addresses...' },
      { p: 35, name: 'Initiating Parallel SYN Stealth Scan', log: 'Scanning 1000 ports on active discovered hosts...' },
      { p: 60, name: 'Initiating Service & Version Detection', log: 'Probing open ports for banners and service fingerprints...' },
      { p: 80, name: 'Initiating OS Detection & Fingerprinting', log: 'Matching TCP/IP fingerprint against Nmap OS database...' },
      { p: 95, name: 'Initiating Parallel Traceroute', log: 'Tracing route hops and measuring latency...' },
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
        setCurrentPhase('Scan Completed Successfully');

        const isPingScan = command.includes('-sn') || command.includes('-sP');
        const upHosts = fullScan.hosts.filter((h) => h.status.state === 'up');
        const hostsWithOpenPorts = fullScan.hosts.filter((h) => h.ports.some((p) => p.state === 'open'));

        let hostsToReturn = fullScan.hosts;
        if (isPingScan) {
          hostsToReturn = upHosts.length > 0 ? upHosts : fullScan.hosts;
        } else if (excludeZeroPortHosts && hostsWithOpenPorts.length > 0) {
          hostsToReturn = hostsWithOpenPorts;
        }

        setStreamedHosts(fullScan.hosts);
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Nmap done: ${totalHosts} IP addresses scanned in 4.25 seconds.`,
          `[${new Date().toLocaleTimeString()}] Topology updated: ${hostsToReturn.length} host(s) mapped (${
            isPingScan ? `${upHosts.length} responded to ping` : `${hostsWithOpenPorts.length} with open ports`
          }).`,
        ]);
        setIsRunning(false);
        onScanCompleted({ ...fullScan, hosts: hostsToReturn }, 'simulated', command);
      }
    }, 900);
  };

  // Run Real Nmap Scan via API Route
  const handleStartLiveScan = async () => {
    setIsRunning(true);
    setProgress(10);
    setStreamedHosts([]);
    setCurrentPhase('Connecting to Nmap engine...');
    setLogs([
      `[${new Date().toLocaleTimeString()}] [LIVE EXECUTION] Initializing real Nmap process on host...`,
      `[${new Date().toLocaleTimeString()}] Command: ${command}`,
    ]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let receivedXml = '';

      setProgress(25);
      setCurrentPhase('Executing real Nmap probes...');

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

              const txt = event.line.toLowerCase();
              if (txt.includes('initiating ping scan') || txt.includes('initiating arp') || txt.includes('ping scan')) {
                setProgress(35);
                setCurrentPhase('Ping Sweep & Host Discovery Probing...');
              } else if (txt.includes('initiating syn stealth') || txt.includes('initiating connect scan') || txt.includes('scanning')) {
                setProgress(55);
                setCurrentPhase('Port Scanning & State Detection...');
              } else if (txt.includes('initiating service scan') || txt.includes('version')) {
                setProgress(75);
                setCurrentPhase('Service & Application Fingerprinting...');
              } else if (txt.includes('initiating os detection')) {
                setProgress(85);
                setCurrentPhase('OS TCP/IP Fingerprinting...');
              } else if (txt.includes('discovering open port') || txt.includes('discovered open port')) {
                setProgress((p) => Math.min(90, p + 5));
              }
            } else if (event.type === 'stderr' && event.line) {
              setLogs((prev) => [...prev, `[STDERR] ${event.line}`]);
            } else if (event.type === 'error' && event.error) {
              setLogs((prev) => [...prev, `[ERROR] ${event.error}`]);
              setCurrentPhase(`Error: ${event.error}`);
            } else if (event.type === 'done') {
              if (event.xml) {
                receivedXml = event.xml;
              }
            }
          } catch (e) {
            setLogs((prev) => [...prev, line]);
          }
        }
      }

      if (receivedXml) {
        setProgress(95);
        setCurrentPhase('Parsing XML output into Topology & Geo layers...');
        const parsedScan = parseNmapXml(receivedXml);
        setStreamedHosts(parsedScan.hosts);
        setProgress(100);
        setCurrentPhase('Live Real Scan Completed');

        const isPingScan = command.includes('-sn') || command.includes('-sP');
        const upHosts = parsedScan.hosts.filter((h) => h.status.state === 'up');
        const hostsWithOpenPorts = parsedScan.hosts.filter((h) => h.ports.some((p) => p.state === 'open'));

        let hostsToReturn = parsedScan.hosts;
        let summaryMsg = '';

        if (isPingScan) {
          hostsToReturn = upHosts.length > 0 ? upHosts : parsedScan.hosts;
          summaryMsg = `✔ Ping Discovery Complete: ${upHosts.length} host(s) responded to ping probes (state=up).`;
        } else if (excludeZeroPortHosts && hostsWithOpenPorts.length > 0) {
          hostsToReturn = hostsWithOpenPorts;
          const zeroPortCount = parsedScan.hosts.length - hostsWithOpenPorts.length;
          summaryMsg = `✔ Port Scan Complete: Loaded ${hostsToReturn.length} host(s) with open ports (${zeroPortCount} empty 0-port IPs excluded).`;
        } else {
          hostsToReturn = upHosts.length > 0 ? upHosts : parsedScan.hosts;
          summaryMsg = `✔ Scan Complete: Loaded ${hostsToReturn.length} host(s) (${hostsWithOpenPorts.length} with open ports, ${upHosts.length} responsive to ping).`;
        }

        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ${summaryMsg}`,
          `[${new Date().toLocaleTimeString()}] Total IP addresses probed: ${parsedScan.hosts.length}.`,
        ]);
        onScanCompleted({ ...parsedScan, hosts: hostsToReturn }, 'live', command);
      } else {
        setProgress(100);
        setCurrentPhase('Scan finished (No XML produced)');
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Scan process ended without generating XML output. Check console above for error details.`,
        ]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Scan cancelled by user.`]);
        setCurrentPhase('Scan Aborted');
      } else {
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Execution Error: ${err.message}`,
          `[${new Date().toLocaleTimeString()}] Tip: Verify Nmap is installed (/usr/bin/nmap) and target is reachable.`,
        ]);
        setCurrentPhase('Scan Execution Failed');
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
  };

  const handleRun = () => {
    if (isRunning) return;
    if (scanMode === 'live') {
      handleStartLiveScan();
    } else {
      handleStartSimulatedScan();
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
              <span>Nmap Interactive Scan Engine</span>
              {scanMode === 'live' && (
                <span className="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 font-mono text-[10px] font-bold border border-rose-800 flex items-center gap-1">
                  <Radio size={10} className="text-rose-400 animate-ping" />
                  REAL LIVE NETWORK
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400 font-mono">
              {scanMode === 'live'
                ? 'Direct backend execution with live packet delivery'
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
              <span>Detected Local Network Interfaces & Subnets</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">
                Auto-Discovered
              </span>
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

          {interfaces.length === 0 ? (
            <div className="text-xs text-zinc-500 font-mono py-2">
              {isLoadingInterfaces ? 'Scanning system network interfaces...' : 'No active network interfaces detected.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {interfaces.map((iface) => {
                return (
                  <div
                    key={`${iface.name}-${iface.ip}`}
                    className={`p-3 rounded-xl border transition-all text-xs font-mono space-y-2 ${
                      iface.isInternal
                        ? 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400'
                        : 'bg-zinc-950/90 border-sky-900/50 hover:border-sky-500/80 text-zinc-200 shadow-sm'
                    }`}
                  >
                    {/* Interface Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          iface.isInternal ? 'bg-zinc-800 text-zinc-400' : 'bg-sky-950 text-sky-400 border border-sky-800/60'
                        }`}>
                          {iface.name}
                        </span>
                        <span className="font-bold text-white text-sm">{iface.networkCidr}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {iface.isInternal ? 'Loopback' : 'Active Subnet'}
                      </span>
                    </div>

                    {/* Host IP & Mask Info */}
                    <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                      <span>Host IP: <strong className="text-emerald-400">{iface.ip}</strong></span>
                      <span>Mask: <span className="text-zinc-500">{iface.netmask}</span></span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="pt-1.5 border-t border-zinc-800/80 flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setCommand(iface.suggestedCommands.fastPortScan)}
                        className="px-2 py-1 rounded bg-zinc-900 hover:bg-sky-600 hover:text-white text-sky-400 text-[10.5px] border border-zinc-800 transition-colors flex items-center gap-1"
                        title={`Populate Fast Port Scan: ${iface.suggestedCommands.fastPortScan}`}
                      >
                        <Zap size={10} />
                        <span>Port Scan ({iface.networkCidr})</span>
                      </button>

                      <button
                        onClick={() => setCommand(iface.suggestedCommands.fastPingScan)}
                        className="px-2 py-1 rounded bg-zinc-900 hover:bg-emerald-600 hover:text-white text-emerald-400 text-[10.5px] border border-zinc-800 transition-colors flex items-center gap-1"
                        title={`Populate Ping Discovery Sweep: ${iface.suggestedCommands.fastPingScan}`}
                      >
                        <Radio size={10} />
                        <span>Ping Sweep (-sn)</span>
                      </button>

                      <button
                        onClick={() => setCommand(iface.suggestedCommands.singleHostScan)}
                        className="px-2 py-1 rounded bg-zinc-900 hover:bg-amber-600 hover:text-white text-amber-400 text-[10.5px] border border-zinc-800 transition-colors flex items-center gap-1"
                        title={`Populate Self Host: ${iface.suggestedCommands.singleHostScan}`}
                      >
                        <Laptop size={10} />
                        <span>Self Host ({iface.ip})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Target & Command Suggestions (External / Authorized) */}
      {scanMode === 'live' && !isRunning && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="text-zinc-500 font-semibold">Authorized Presets:</span>
          <button
            onClick={() => setCommand('nmap -sn scanme.nmap.org')}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 transition-colors flex items-center gap-1"
          >
            <Radio size={11} />
            <span>scanme.nmap.org (Ping Sweep)</span>
          </button>
          <button
            onClick={() => setCommand('nmap -sV -F scanme.nmap.org')}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-sky-400 border border-zinc-800 transition-colors"
          >
            scanme.nmap.org (Port Scan)
          </button>
          <button
            onClick={() => setCommand('nmap -sn 127.0.0.1')}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 transition-colors"
          >
            127.0.0.1 (Ping Localhost)
          </button>
        </div>
      )}

      {/* Scanning Options Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <label className="flex items-center gap-2 text-zinc-300 font-medium cursor-pointer select-none bg-zinc-900/60 hover:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 transition-colors">
          <input
            type="checkbox"
            checked={excludeZeroPortHosts}
            onChange={(e) => setExcludeZeroPortHosts(e.target.checked)}
            className="rounded bg-zinc-950 border-zinc-700 text-amber-500 focus:ring-0"
          />
          <Shield size={13} className={excludeZeroPortHosts ? 'text-amber-400' : 'text-zinc-500'} />
          <span className="font-semibold text-zinc-200">Exclude zero-port hosts during port scans</span>
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">(Auto-disabled for ping sweeps)</span>
        </label>

        {streamedHosts.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-zinc-500">Show:</span>
            <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[10.5px]">
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
                <span>Open Ports ({hostsWithPortsCount})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Command Input Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className={`absolute left-3.5 top-2.5 font-mono font-bold text-sm select-none ${
            scanMode === 'live' ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            $
          </span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isRunning}
            placeholder={
              scanMode === 'live'
                ? 'nmap -sn 192.168.0.0/24 or nmap -sV -F 192.168.0.0/24'
                : 'nmap -sS -sV -O -A --traceroute target...'
            }
            className={`w-full pl-8 pr-4 py-2 rounded-xl bg-black border font-mono text-xs placeholder-zinc-600 focus:outline-none disabled:opacity-60 ${
              scanMode === 'live'
                ? 'border-rose-900/60 text-rose-200 focus:border-rose-500'
                : 'border-zinc-800 text-sky-300 focus:border-sky-500'
            }`}
          />
        </div>

        {isRunning ? (
          <button
            onClick={handleStopScan}
            className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold shadow transition-colors flex items-center gap-2"
          >
            <Square size={14} />
            <span>Stop Scan</span>
          </button>
        ) : (
          <button
            onClick={handleRun}
            className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow transition-colors flex items-center gap-2 ${
              scanMode === 'live'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'
                : 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/40'
            }`}
          >
            <Play size={14} />
            <span>{scanMode === 'live' ? 'Run Live Scan' : 'Run Simulated Scan'}</span>
          </button>
        )}
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
              Discovered Active Targets ({visibleStreamedHosts.length}
              {streamedHosts.length > visibleStreamedHosts.length
                ? ` filtered / ${streamedHosts.length} total`
                : ''}):
            </span>
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
                      isUp ? (openPorts.length > 0 ? 'bg-emerald-400' : 'bg-sky-400') : 'bg-rose-500'
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
                : line.includes('✔') || line.includes('Successfully') || line.includes('Complete')
                ? 'text-emerald-400'
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
