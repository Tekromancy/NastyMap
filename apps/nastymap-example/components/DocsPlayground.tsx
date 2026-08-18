'use client';

import React, { useState } from 'react';
import { Terminal, Copy, Check, Code, Package, BookOpen, Layers, Globe, Shield } from 'lucide-react';

export function DocsPlayground() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (code: string, key: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(code);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const codeSnippetInstall = `pnpm add nastymap lucide-react`;

  const codeSnippetBasic = `import React from 'react';
import { NmapTopologyView, parseNmapXml } from 'nastymap';

export function MySecurityDashboard({ xmlScanString }: { xmlScanString: string }) {
  const scan = parseNmapXml(xmlScanString);

  return (
    <div className="w-full h-screen bg-zinc-950 p-4">
      <h1 className="text-xl font-bold text-white mb-4">Enterprise Threat Map</h1>
      
      {/* Interactive Network Topology with physics & detail drawer */}
      <NmapTopologyView
        scan={scan}
        initialLayout="force" // 'force' | 'traceroute' | 'radial' | 'subnet'
        onSelectHost={(host) => console.log('Selected Host:', host)}
      />
    </div>
  );
}`;

  const codeSnippetGeo = `import React from 'react';
import { NmapGeoMap, parseNmapXml } from 'nastymap';

export function GlobalPerimeterMap({ xmlScanString }: { xmlScanString: string }) {
  const scan = parseNmapXml(xmlScanString);

  return (
    <NmapGeoMap
      scan={scan}
      onSelectHost={(host) => console.log('Inspecting IP in Geo map:', host.ipv4)}
    />
  );
}`;

  const codeSnippetDiff = `import React from 'react';
import { NmapDiffView, parseNmapXml } from 'nastymap';

export function IncidentChangelog({ baselineXml, currentXml }) {
  const scanA = parseNmapXml(baselineXml);
  const scanB = parseNmapXml(currentXml);

  return (
    <NmapDiffView
      scanA={scanA}
      scanB={scanB}
    />
  );
}`;

  return (
    <div className="p-6 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 space-y-6">
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <Package size={22} className="text-sky-400" />
          <h3 className="text-lg font-bold text-white">NastyMap Reusable React Library</h3>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          <code className="text-sky-300 font-mono">nastymap</code> is published as a modular TypeScript/React library. Embed interactive network topologies, traceroute trees, and GeoIP world maps into your own cybersecurity tools with one line of code!
        </p>
      </div>

      {/* 1. Installation */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <Terminal size={14} className="text-emerald-400" />
          <span>1. Installation</span>
        </span>
        <div className="p-3 rounded-xl bg-black border border-zinc-800 flex items-center justify-between font-mono text-xs text-emerald-400">
          <span>{codeSnippetInstall}</span>
          <button
            onClick={() => handleCopy(codeSnippetInstall, 'install')}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800"
          >
            {copiedKey === 'install' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* 2. Interactive Topology Example */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <Layers size={14} className="text-sky-400" />
          <span>2. Interactive Network Topology Component</span>
        </span>
        <div className="relative">
          <pre className="p-4 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto">
            {codeSnippetBasic}
          </pre>
          <button
            onClick={() => handleCopy(codeSnippetBasic, 'basic')}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white"
          >
            {copiedKey === 'basic' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* 3. Geo Threat Map Example */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <Globe size={14} className="text-purple-400" />
          <span>3. Geographic IP Threat Map Component</span>
        </span>
        <div className="relative">
          <pre className="p-4 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto">
            {codeSnippetGeo}
          </pre>
          <button
            onClick={() => handleCopy(codeSnippetGeo, 'geo')}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white"
          >
            {copiedKey === 'geo' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* 4. Security Scan Diff Example */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <Shield size={14} className="text-rose-400" />
          <span>4. Security Incident Diff & Comparison</span>
        </span>
        <div className="relative">
          <pre className="p-4 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto">
            {codeSnippetDiff}
          </pre>
          <button
            onClick={() => handleCopy(codeSnippetDiff, 'diff')}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white"
          >
            {copiedKey === 'diff' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
