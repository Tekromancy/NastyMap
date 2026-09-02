'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, ShieldCheck, Clock, AlertTriangle, ArrowRight, RotateCcw, CheckCircle2 } from 'lucide-react';
import type { MaliciousThreatInfo } from 'nastymap';

export interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNextMission: () => void;
  threats: MaliciousThreatInfo[];
  elapsedSeconds: number;
  falseAlarmCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export function VictoryModal({
  isOpen,
  onClose,
  onNextMission,
  threats,
  elapsedSeconds,
  falseAlarmCount,
  difficulty,
}: VictoryModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire celebratory cyber confetti!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#34d399', '#f59e0b', '#818cf8'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate score and rank
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  let rank = '⭐⭐⭐ Elite Threat Hunter (S-Tier)';
  let rankColor = 'text-emerald-400';
  if (falseAlarmCount > 2 || elapsedSeconds > 180) {
    rank = '⭐ Junior Incident Responder (C-Tier)';
    rankColor = 'text-amber-400';
  } else if (falseAlarmCount > 0 || elapsedSeconds > 90) {
    rank = '⭐⭐ Security Operations Analyst (A-Tier)';
    rankColor = 'text-sky-400';
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-950 border border-emerald-600/80 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in duration-200 text-zinc-100 my-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/80 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/60">
            <Trophy size={32} className="animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                NETWORK PERIMETER SECURED!
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-700 uppercase">
                {difficulty} Cleared
              </span>
            </div>
            <p className="text-xs text-emerald-300 font-mono mt-0.5">
              All malicious implants and rogue pivots were successfully neutralized.
            </p>
          </div>
        </div>

        {/* Scorecard Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
            <span className="text-zinc-400 text-[10px] uppercase font-bold flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-400" />
              Threats Neutralized
            </span>
            <p className="text-lg font-bold text-emerald-400">{threats.length} / {threats.length}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
            <span className="text-zinc-400 text-[10px] uppercase font-bold flex items-center gap-1">
              <Clock size={12} className="text-sky-400" />
              Time Elapsed
            </span>
            <p className="text-lg font-bold text-white">{timeFormatted}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
            <span className="text-zinc-400 text-[10px] uppercase font-bold flex items-center gap-1">
              <AlertTriangle size={12} className="text-amber-400" />
              False Alarms
            </span>
            <p className={`text-lg font-bold ${falseAlarmCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {falseAlarmCount} innocent
            </p>
          </div>
        </div>

        {/* Investigator Rank */}
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between font-mono text-xs">
          <span className="text-zinc-400">Investigator Rating:</span>
          <span className={`font-bold ${rankColor}`}>{rank}</span>
        </div>

        {/* Forensic Debrief of Discovered Threats */}
        <div className="space-y-2.5">
          <span className="font-bold text-zinc-300 uppercase text-[11px] tracking-wider block">
            Post-Incident Forensics Report:
          </span>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {threats.map((threat, idx) => (
              <div
                key={threat.threatId || idx}
                className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-300 flex items-center justify-center text-[10px] border border-rose-800">
                      {idx + 1}
                    </span>
                    <span>{threat.name}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-mono font-bold border border-rose-800">
                    {threat.severity}
                  </span>
                </div>
                <p className="text-zinc-300 text-[11.5px] leading-relaxed">{threat.description}</p>
                <div className="pt-1.5 border-t border-zinc-800 text-[11px] font-mono text-zinc-400">
                  <span className="text-emerald-400 font-semibold">Remediation: </span>
                  <span>{threat.remediation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs border border-zinc-800 transition-colors"
          >
            Review Cleaned Topology
          </button>

          <button
            onClick={onNextMission}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2"
          >
            <span>Deploy Next Mission</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
