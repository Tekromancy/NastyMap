'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { NmapHost, NmapRun, TopologyNode, HostAction, CustomDrawerTab } from 'nastymap';
import {
  generateNetworkScenario,
  NmapTopologyView,
  HostTable,
  NmapGeoMap,
  HostDetailDrawer,
  type MaliciousThreatInfo,
} from 'nastymap';
import { ThreatHuntHUD } from './ThreatHuntHUD';
import { VictoryModal } from './VictoryModal';
import { BriefingModal } from './BriefingModal';
import {
  Crosshair,
  ShieldAlert,
  ShieldCheck,
  Table,
  Globe,
  Network,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export function ThreatHuntGame() {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [activeSubTab, setActiveSubTab] = useState<'topology' | 'table' | 'geo'>('topology');

  // Game & Scenario State
  const [currentScan, setCurrentScan] = useState<NmapRun | null>(null);
  const [threats, setThreats] = useState<MaliciousThreatInfo[]>([]);
  const [neutralizedThreatIds, setNeutralizedThreatIds] = useState<Set<string>>(new Set());
  const [falseAlarmCount, setFalseAlarmCount] = useState<number>(0);

  // Modals & Inspection
  const [showBriefingModal, setShowBriefingModal] = useState<boolean>(false);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [selectedHost, setSelectedHost] = useState<NmapHost | null>(null);

  // Mission Timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // In-Game Feedback Banner
  const [gameAlert, setGameAlert] = useState<{
    message: string;
    type: 'threat' | 'alarm' | 'info';
    id: number;
  } | null>(null);

  const showNotification = (message: string, type: 'threat' | 'alarm' | 'info') => {
    setGameAlert({ message, type, id: Date.now() });
    setTimeout(() => {
      setGameAlert((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Helper to generate a new scenario
  const initScenario = (diff: 'easy' | 'medium' | 'hard') => {
    let totalHosts = 18;
    let threatCount = 1;

    if (diff === 'medium') {
      totalHosts = 24;
      threatCount = 2;
    } else if (diff === 'hard') {
      totalHosts = 32;
      threatCount = 4;
    }

    const { scan, threats: generatedThreats } = generateNetworkScenario({
      difficulty: diff,
      totalHosts,
      threatCount,
      subnet: '192.168.1.0/24',
    });

    setCurrentScan(scan);
    setThreats(generatedThreats);
    setNeutralizedThreatIds(new Set());
    setFalseAlarmCount(0);
    setElapsedSeconds(0);
    setIsTimerRunning(true);
    setShowVictoryModal(false);
    setSelectedHost(null);
  };

  // Initialize on mount
  useEffect(() => {
    initScenario(difficulty);
  }, []);

  // Timer interval
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const handleSelectDifficulty = (d: 'easy' | 'medium' | 'hard') => {
    setDifficulty(d);
    initScenario(d);
  };

  const handleRestartScenario = () => {
    initScenario(difficulty);
  };

  const handleNextMission = () => {
    setShowVictoryModal(false);
    const nextDiff = difficulty === 'easy' ? 'medium' : difficulty === 'medium' ? 'hard' : 'hard';
    setDifficulty(nextDiff);
    initScenario(nextDiff);
  };

  // Host Updater
  const handleUpdateHost = (hostId: string, updater: (prev: NmapHost) => NmapHost | Partial<NmapHost>) => {
    if (!currentScan) return;
    const updatedHosts = currentScan.hosts.map((h) => {
      if (h.id === hostId || h.ipv4 === hostId) {
        const patch = updater(h);
        return { ...h, ...patch } as NmapHost;
      }
      return h;
    });
    setCurrentScan({ ...currentScan, hosts: updatedHosts });

    if (selectedHost && (selectedHost.id === hostId || selectedHost.ipv4 === hostId)) {
      setSelectedHost((prev) => (prev ? ({ ...prev, ...updater(prev) } as NmapHost) : null));
    }
  };

  // Action: Quarantine Host
  const handleToggleQuarantine = (host: NmapHost) => {
    const isCurrentlyQuarantined = host.isQuarantined;
    const nextState = !isCurrentlyQuarantined;

    const isMalicious = host.customData?.isMalicious === true;
    const threatInfo: MaliciousThreatInfo | undefined = host.customData?.threatInfo;

    handleUpdateHost(host.id, (prev) => ({
      isQuarantined: nextState,
      tags: nextState
        ? Array.from(new Set([...(prev.tags || []), 'quarantined', isMalicious ? 'threat-neutralized' : 'false-alarm']))
        : (prev.tags || []).filter((t) => t !== 'quarantined' && t !== 'threat-neutralized' && t !== 'false-alarm'),
    }));

    if (nextState) {
      if (isMalicious && threatInfo) {
        const nextNeutralized = new Set(neutralizedThreatIds);
        nextNeutralized.add(threatInfo.threatId);
        setNeutralizedThreatIds(nextNeutralized);

        showNotification(`🎯 THREAT NEUTRALIZED! You caught ${threatInfo.name}!`, 'threat');

        if (nextNeutralized.size >= threats.length) {
          setIsTimerRunning(false);
          setTimeout(() => {
            setShowVictoryModal(true);
          }, 800);
        }
      } else {
        setFalseAlarmCount((c) => c + 1);
        const deviceType = host.customData?.deviceCategory || host.deviceType || 'device';
        showNotification(
          `⚠️ FALSE ALARM! ${host.primaryHostname || host.ipv4} is an innocent ${deviceType}. Avoid disrupting normal users!`,
          'alarm'
        );
      }
    } else {
      if (isMalicious && threatInfo) {
        const nextNeutralized = new Set(neutralizedThreatIds);
        nextNeutralized.delete(threatInfo.threatId);
        setNeutralizedThreatIds(nextNeutralized);
      }
      showNotification(`Host ${host.ipv4 || host.id} quarantine released.`, 'info');
    }
  };

  const customActions: HostAction[] = [
    {
      id: 'quarantine-threat',
      label: 'Flag / Quarantine',
      icon: <ShieldAlert size={14} className="text-rose-400" />,
      shortcut: 'q',
      variant: 'warning',
      tooltip: 'Quarantine suspected rogue host (Shortcut: Q)',
      onClick: async (host) => {
        handleToggleQuarantine(host);
      },
    },
    {
      id: 'deep-forensics',
      label: 'Inspect Forensics',
      icon: <Sparkles size={14} className="text-sky-400" />,
      shortcut: 'd',
      variant: 'primary',
      tooltip: 'Run automated forensic analysis (Shortcut: D)',
      onClick: async (host, context) => {
        context.notify?.(`Probing forensics on ${host.ipv4 || host.id}...`, 'info');
        await new Promise((r) => setTimeout(r, 400));

        if (host.customData?.isMalicious) {
          context.notify?.(
            `🚨 CRITICAL ANOMALY: Suspicious network signatures and rogue listeners detected!`,
            'error'
          );
        } else {
          context.notify?.(
            `✔ Clean Profile: Host behaviors match normal ${host.customData?.deviceCategory || 'authorized'} baseline.`,
            'success'
          );
        }
      },
    },
  ];

  const customDrawerTabs: CustomDrawerTab[] = [
    {
      id: 'threat-forensics',
      label: '🕵️ Incident Intel',
      badge: (h) => (h.customData?.isMalicious ? 'Suspicious' : 'Normal'),
      render: (h) => {
        const isMalicious = h.customData?.isMalicious === true;
        const threat: MaliciousThreatInfo | undefined = h.customData?.threatInfo;

        return (
          <div className="space-y-4 text-xs font-sans">
            {isMalicious && threat ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300 text-sm">{threat.name}</span>
                  <span className="px-2 py-0.5 rounded bg-rose-900 text-rose-200 text-[10px] font-mono font-bold">
                    {threat.severity}
                  </span>
                </div>
                <p className="text-zinc-300 leading-relaxed">{threat.description}</p>

                <div className="space-y-1 pt-2 border-t border-rose-900/60 font-mono text-[11px]">
                  <span className="font-bold text-rose-300 uppercase">Detection Anomalies:</span>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-300">
                    {threat.detectionClues.map((clue, idx) => (
                      <li key={idx}>{clue}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-2.5 rounded-lg bg-black/50 border border-rose-900/60 text-[11px] font-mono text-emerald-400">
                  <strong>Recommended Action: </strong>
                  <span>{threat.remediation}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 size={16} />
                  <span>Authorized Device Profile</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  This host exhibits normal network characteristics conforming to an authorized{' '}
                  <strong className="text-white">{h.customData?.deviceCategory || 'network device'}</strong>.
                </p>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Quarantining this device is unnecessary and will register as a False Positive in your incident report.
                </p>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  const selectedNodeForDrawer: TopologyNode | null = useMemo(() => {
    if (!selectedHost) return null;
    return {
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
      hostRef: selectedHost,
      x: 0,
      y: 0,
      radius: 12,
      isQuarantined: selectedHost.isQuarantined,
    };
  }, [selectedHost]);

  if (!currentScan) {
    return (
      <div className="p-8 text-center text-zinc-500 font-mono text-xs">
        Loading cyber threat hunt scenario...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* HUD Header */}
      <ThreatHuntHUD
        threats={threats}
        neutralizedThreatIds={neutralizedThreatIds}
        falseAlarmCount={falseAlarmCount}
        elapsedSeconds={elapsedSeconds}
        difficulty={difficulty}
        onSelectDifficulty={handleSelectDifficulty}
        onRestartScenario={handleRestartScenario}
        onOpenBriefing={() => setShowBriefingModal(true)}
      />

      {/* In-Game Alert */}
      {gameAlert && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono animate-in fade-in slide-in-from-top-2 duration-150 ${
            gameAlert.type === 'threat'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 shadow-lg shadow-emerald-950/40'
              : gameAlert.type === 'alarm'
              ? 'bg-amber-950/80 text-amber-300 border-amber-700 shadow-lg shadow-amber-950/40'
              : 'bg-sky-950/80 text-sky-300 border-sky-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {gameAlert.type === 'threat' ? (
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            )}
            <span className="font-semibold">{gameAlert.message}</span>
          </div>
        </div>
      )}

      {/* Sub-Tabs for Game (Topology / Matrix / Geo) */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('topology')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeSubTab === 'topology' ? 'bg-rose-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Network size={13} />
            <span>Interactive Topology</span>
          </button>
          <button
            onClick={() => setActiveSubTab('table')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeSubTab === 'table' ? 'bg-rose-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Table size={13} />
            <span>Host Directory</span>
          </button>
          <button
            onClick={() => setActiveSubTab('geo')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeSubTab === 'geo' ? 'bg-rose-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe size={13} />
            <span>Threat Map</span>
          </button>
        </div>

        <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 text-rose-300 border border-zinc-700">Q</kbd> to quarantine selected host</span>
        </div>
      </div>

      {/* Views */}
      {activeSubTab === 'topology' && (
        <NmapTopologyView
          scan={currentScan}
          initialLayout="force"
          onSelectHost={(host) => setSelectedHost(host)}
          onUpdateHost={handleUpdateHost}
          customActions={customActions}
          customTabs={customDrawerTabs}
        />
      )}

      {activeSubTab === 'table' && (
        <HostTable scan={currentScan} onSelectHost={(host) => setSelectedHost(host)} />
      )}

      {activeSubTab === 'geo' && (
        <NmapGeoMap scan={currentScan} onSelectHost={(host) => setSelectedHost(host)} />
      )}

      {/* Host Detail Drawer */}
      <HostDetailDrawer
        node={selectedNodeForDrawer}
        onClose={() => setSelectedHost(null)}
        onUpdateHost={handleUpdateHost}
        customActions={customActions}
        customTabs={customDrawerTabs}
      />

      {/* Modals */}
      <BriefingModal
        isOpen={showBriefingModal}
        onClose={() => setShowBriefingModal(false)}
        threatCount={threats.length}
        difficulty={difficulty}
      />

      <VictoryModal
        isOpen={showVictoryModal}
        onClose={() => setShowVictoryModal(false)}
        onNextMission={handleNextMission}
        threats={threats}
        elapsedSeconds={elapsedSeconds}
        falseAlarmCount={falseAlarmCount}
        difficulty={difficulty}
      />
    </div>
  );
}
