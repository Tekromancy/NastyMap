'use client';

import React, { useState } from 'react';
import {
  Crosshair,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import type { MaliciousThreatInfo } from 'nastymap';

export interface ThreatHuntHUDProps {
  threats: MaliciousThreatInfo[];
  neutralizedThreatIds: Set<string>;
  falseAlarmCount: number;
  elapsedSeconds: number;
  difficulty: 'easy' | 'medium' | 'hard';
  onSelectDifficulty: (d: 'easy' | 'medium' | 'hard') => void;
  onRestartScenario: () => void;
  onOpenBriefing: () => void;
}

export function ThreatHuntHUD({
  threats,
  neutralizedThreatIds,
  falseAlarmCount,
  elapsedSeconds,
  difficulty,
  onSelectDifficulty,
  onRestartScenario,
  onOpenBriefing,
}: ThreatHuntHUDProps) {
  const [showClues, setShowClues] = useState(false);

  const neutralizedCount = neutralizedThreatIds.size;
  const totalThreats = threats.length;
  const remainingCount = totalThreats - neutralizedCount;

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800/90 shadow-2xl p-4 sm:p-5 space-y-4">
      {/* Top Row: Mission Status, Difficulty, Timer & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Game Title & Radar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950/70 border border-rose-700/70 flex items-center justify-center text-rose-400 shadow-inner">
            <Crosshair size={22} className="animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <span>NastyMap</span>
                <span className="text-rose-400">Threat Hunter</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 font-mono text-[10px] font-bold border border-rose-800/80 animate-pulse">
                LIVE HUNT
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Identify and isolate rogue network implants hiding among legitimate devices
            </p>
          </div>
        </div>

        {/* HUD Counters & Stats */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          {/* Threats Neutralized */}
          <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-400" />
            <span className="text-zinc-400">Threats:</span>
            <span className="font-bold text-white">
              {neutralizedCount} / {totalThreats}
            </span>
          </div>

          {/* False Alarms */}
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-colors ${
              falseAlarmCount > 0
                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            <AlertTriangle size={15} className={falseAlarmCount > 0 ? 'text-amber-400' : 'text-zinc-500'} />
            <span>False Alarms:</span>
            <strong className={falseAlarmCount > 0 ? 'text-amber-300' : 'text-zinc-300'}>
              {falseAlarmCount}
            </strong>
          </div>

          {/* Timer */}
          <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2">
            <Clock size={15} className="text-sky-400" />
            <span className="text-zinc-400">Time:</span>
            <strong className="text-sky-300">{timeFormatted}</strong>
          </div>
        </div>

        {/* Difficulty Controls & Scenario Actions */}
        <div className="flex items-center gap-2">
          {/* Difficulty Dropdown */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                onClick={() => onSelectDifficulty(d)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors text-[11px] ${
                  difficulty === d
                    ? 'bg-rose-600 text-white shadow font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Clues / Hint Button */}
          <button
            onClick={() => setShowClues((v) => !v)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showClues
                ? 'bg-sky-950 text-sky-300 border-sky-700'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
            title="Forensic Clues & Threat Intel"
          >
            <HelpCircle size={14} className="text-sky-400" />
            <span className="hidden sm:inline">Intel Clues</span>
          </button>

          {/* Briefing Button */}
          <button
            onClick={onOpenBriefing}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            title="Read Mission Briefing"
          >
            <BookOpen size={15} />
          </button>

          {/* Regenerate New Scenario */}
          <button
            onClick={onRestartScenario}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Generate a new randomized network scenario"
          >
            <RotateCcw size={14} className="text-amber-400" />
            <span className="hidden sm:inline">New Network</span>
          </button>
        </div>
      </div>

      {/* Clues / Threat Intel Popover Drawer */}
      {showClues && (
        <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/60 text-xs space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sky-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Sparkles size={14} className="text-sky-400" />
              <span>Forensic Analyst Intel Clues</span>
            </span>
            <span className="text-[10.5px] font-mono text-zinc-400">
              {remainingCount} rogue target(s) remaining
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-[11.5px] text-zinc-300">
            <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
              <strong className="text-emerald-400 block font-mono">1. Unauthorized Port Listeners:</strong>
              <p className="text-zinc-400 leading-tight">
                Rogue implants frequently open non-standard reverse shells or mining protocols (e.g. port 4444, 3333, 1337, or 6200).
              </p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
              <strong className="text-sky-400 block font-mono">2. Masquerading Identities:</strong>
              <p className="text-zinc-400 leading-tight">
                Inspect MAC address hardware vendors. A device claiming to be a printer that has a Raspberry Pi or Alfa Network MAC is highly suspect.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
              <strong className="text-rose-400 block font-mono">3. Known Exploit CVEs:</strong>
              <p className="text-zinc-400 leading-tight">
                Read the NSE Scripts tab in the host inspector to spot EternalBlue (MS17-010) or Metasploit payload signatures.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
