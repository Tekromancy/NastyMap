'use client';

import React from 'react';
import { ShieldAlert, Crosshair, AlertTriangle, Terminal, CheckCircle2, X } from 'lucide-react';

export interface BriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  threatCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export function BriefingModal({ isOpen, onClose, threatCount, difficulty }: BriefingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl rounded-2xl bg-zinc-950 border border-sky-700/80 shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in duration-200 text-zinc-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-950/80 border border-sky-600/70 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
              <Crosshair size={26} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Mission Briefing: Threat Hunt</h2>
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-mono text-[10px] font-bold border border-rose-800 uppercase">
                  {difficulty}
                </span>
              </div>
              <p className="text-xs text-sky-300 font-mono">Incident Response & Network Forensics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Story / Objective */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 space-y-2.5 leading-relaxed">
          <p>
            <strong className="text-white">Attention Investigator:</strong> Security operations flagged suspicious beaconing across the local subnet. Multiple rogue implants and compromised machines have infiltrated the network.
          </p>
          <p className="text-zinc-400">
            They are actively hiding amongst normal employee <strong className="text-zinc-200">iPhones, Androids, MacBooks, ThinkPads, and smart IoT devices</strong> (cameras, smart TVs, printers).
          </p>
          <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-900/60 font-mono text-sky-200 text-xs flex items-center justify-between">
            <span>Primary Objective:</span>
            <strong className="text-sky-300 text-sm">Find & Quarantine {threatCount} Rogue Threats</strong>
          </div>
        </div>

        {/* How to Play Rules */}
        <div className="space-y-2 text-xs">
          <span className="font-bold text-zinc-300 uppercase text-[11px] tracking-wider block">
            Investigation Rules & Forensic Clues:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                <span>Examine Open Ports</span>
              </span>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Look for suspicious ports: <code className="text-sky-300">4444</code> (Metasploit), <code className="text-sky-300">3333</code> (Cryptominer), <code className="text-sky-300">1337</code>, or <code className="text-sky-300">6200</code>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
              <span className="font-bold text-sky-400 flex items-center gap-1.5">
                <Terminal size={13} />
                <span>Read NSE Scripts</span>
              </span>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Inspect script output for known CVEs (like EternalBlue MS17-010 or vsftpd backdoor).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={13} />
                <span>Avoid False Alarms</span>
              </span>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Quarantining normal employee phones or the office printer counts as a <strong className="text-amber-300">False Positive</strong> and penalizes your score!
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
              <span className="font-bold text-purple-400 flex items-center gap-1.5">
                <ShieldAlert size={13} />
                <span>Neutralize with 'Q'</span>
              </span>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Click any host to inspect, then hit <kbd className="px-1 py-0.5 rounded bg-black text-[10px] text-purple-300 border border-zinc-700">Q</kbd> or click <strong>Quarantine</strong> to neutralize.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-900/40 transition-all flex items-center justify-center gap-2"
          >
            <Crosshair size={15} />
            <span>Accept Mission & Begin Scan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
