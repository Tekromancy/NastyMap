'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { NmapHost, NmapRun } from 'nastymap';
import { parseNmapXml, ENTERPRISE_NETWORK_XML, GLOBAL_PERIMETER_XML } from 'nastymap';
import { Play, Square, Terminal, CheckCircle2, Shield, Activity, Sparkles, RefreshCw } from 'lucide-react';

export interface LiveScanRunnerProps {
  onScanCompleted: (scan: NmapRun) => void;
  className?: string;
}

export function LiveScanRunner({ onScanCompleted, className = '' }: LiveScanRunnerProps) {
  const [command, setCommand] = useState('nmap -sS -sV -O -A --traceroute -T4 10.0.0.0/24');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string>('Ready to scan');
  const [logs, setLogs] = useState<string[]>([
    'NastyMap Interactive Scanner Shell v1.0.0',
    'Type target IP, subnet or hostname to execute simulated real-time parallel scan.',
  ]);
  const [streamedHosts, setStreamedHosts] = useState<NmapHost[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStartScan = () => {
    if (isRunning) return;
    setIsRunning(true);
    setProgress(0);
    setStreamedHosts([]);
    setLogs([
      `[${new Date().toLocaleTimeString()}] Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toUTCString()}`,
      `[${new Date().toLocaleTimeString()}] Executing: ${command}`,
    ]);

    const sourceXml = command.includes('global') || command.includes('1.1.1.1') || command.includes('8.8.8.8')
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

        // Stream partial hosts
        const hostsToShow = fullScan.hosts.slice(0, Math.ceil((currentStep / phases.length) * totalHosts));
        setStreamedHosts(hostsToShow);
      } else {
        // Complete
        clearInterval(interval);
        setProgress(100);
        setCurrentPhase('Scan Completed Successfully');
        setStreamedHosts(fullScan.hosts);
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Nmap done: ${totalHosts} IP addresses (${totalHosts} hosts up) scanned in 4.25 seconds.`,
          `[${new Date().toLocaleTimeString()}] Topology and Geolocation map updated!`,
        ]);
        setIsRunning(false);
        onScanCompleted(fullScan);
      }
    }, 900);
  };

  return (
    <div className={`p-6 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Terminal size={20} className="text-sky-400" />
          <h3 className="text-base font-bold text-white">Live Nmap Scan Terminal & Progress</h3>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950 text-amber-400 font-mono text-xs font-semibold border border-amber-800 animate-pulse">
              <Activity size={13} />
              <span>Scanning...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 font-mono text-xs font-semibold border border-emerald-800">
              <CheckCircle2 size={13} />
              <span>Idle / Ready</span>
            </span>
          )}
        </div>
      </div>

      {/* Command Input Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-2.5 font-mono font-bold text-emerald-400 text-sm select-none">$</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isRunning}
            placeholder="nmap -sS -sV -O -A --traceroute target..."
            className="w-full pl-8 pr-4 py-2 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-sky-300 placeholder-zinc-600 focus:outline-none focus:border-sky-500 disabled:opacity-60"
          />
        </div>

        <button
          onClick={handleStartScan}
          disabled={isRunning}
          className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Scanning</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>Run Scan</span>
            </>
          )}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300">{currentPhase}</span>
          <span className="font-mono text-sky-400 font-bold">{progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Real-time Streaming Host Cards */}
      {streamedHosts.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Discovered Active Targets ({streamedHosts.length}):
          </span>
          <div className="flex flex-wrap gap-2">
            {streamedHosts.map((h) => (
              <div
                key={h.id}
                className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono flex items-center gap-2 animate-fade-in"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-white">{h.ipv4 || h.id}</span>
                {h.primaryHostname && <span className="text-zinc-400">({h.primaryHostname})</span>}
                <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 text-[10px]">
                  {h.ports.filter((p) => p.state === 'open').length} ports
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Console Output Log */}
      <div
        ref={logContainerRef}
        className="p-4 rounded-xl bg-black/90 border border-zinc-800 font-mono text-[11px] text-zinc-300 h-44 overflow-y-auto space-y-1 select-text"
      >
        {logs.map((line, idx) => (
          <div key={idx} className="leading-relaxed">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
