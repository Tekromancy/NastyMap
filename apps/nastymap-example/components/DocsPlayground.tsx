'use client';

import React, { useState } from 'react';
import { Terminal, Copy, Check, Code, Package, BookOpen, Layers, Globe, Shield, Zap } from 'lucide-react';

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

  const codeSnippetExtensibility = `import React, { useState } from 'react';
import { NmapTopologyView, parseNmapXml, updateHostInScan, HostAction, CustomDrawerTab } from 'nastymap';

export function CustomSecurityConsole({ initialXml }: { initialXml: string }) {
  const [scan, setScan] = useState(() => parseNmapXml(initialXml));

  // 1. Define custom host actions with keyboard shortcuts
  const customActions: HostAction[] = [
    {
      id: 'deep-scan',
      label: 'Deep Re-Scan',
      shortcut: 'd', // Pressing 'd' on keyboard triggers this action
      variant: 'primary',
      onClick: async (host, context) => {
        context.notify?.(\`Initiating deep scan for \${host.ipv4}...\`, 'info');
        
        // Execute real backend or simulated nmap command
        const res = await fetch(\`/api/rescan?ip=\${host.ipv4}\`).then(r => r.json());
        
        // Update the host model in-place!
        context.updateHost(prev => ({
          ports: [...prev.ports, ...res.newPorts],
          tags: [...(prev.tags || []), 'audited'],
        }));
        
        context.notify?.(\`Deep scan completed for \${host.ipv4}!\`, 'success');
      }
    },
    {
      id: 'quarantine',
      label: 'Quarantine Host',
      shortcut: 'q',
      variant: 'warning',
      onClick: (host, context) => {
        context.updateHost(prev => ({ isQuarantined: !prev.isQuarantined }));
      }
    }
  ];

  // 2. Inject custom tabs into the Host Inspector Drawer
  const customTabs: CustomDrawerTab[] = [
    {
      id: 'exploits',
      label: 'Exploits & CVEs',
      render: (host, updateHost) => (
        <div>
          <h3>Known Vulnerabilities for {host.primaryOs}</h3>
          <button onClick={() => updateHost(prev => ({ comments: 'Exploit verified' }))}>
            Verify Finding
          </button>
        </div>
      )
    }
  ];

  return (
    <NmapTopologyView
      scan={scan}
      customActions={customActions}
      customTabs={customTabs}
      onUpdateHost={(hostId, updater) => {
        setScan(prev => updateHostInScan(prev, hostId, updater));
      }}
    />
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
    <div className="w-full h-full p-4">
      {/* Side-by-side incident comparison */}
      <NmapDiffView scanA={scanA} scanB={scanB} />
    </div>
  );
}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-zinc-100">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="text-sky-400" size={24} />
          <h2 className="text-xl font-bold">NastyMap Developer Documentation & Playground</h2>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Learn how to integrate the <code className="text-sky-300">nastymap</code> library into your custom security apps, dashboards, SIEMs, or incident response portals.
        </p>
      </div>

      {/* 1. Installation */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <Package size={14} className="text-amber-400" />
          <span>1. Installation</span>
        </span>
        <div className="p-3.5 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-sky-400 flex items-center justify-between">
          <code>{codeSnippetInstall}</code>
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

      {/* 3. Extensibility: Custom Actions & Tabs */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <Zap size={14} className="text-amber-400" />
          <span>3. Custom Actions, Shortcuts & Injected Tabs (Extensibility)</span>
        </span>
        <div className="relative">
          <pre className="p-4 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto">
            {codeSnippetExtensibility}
          </pre>
          <button
            onClick={() => handleCopy(codeSnippetExtensibility, 'ext')}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white"
          >
            {copiedKey === 'ext' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* 4. Geo Threat Map Example */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <Globe size={14} className="text-purple-400" />
          <span>4. Geographic IP Threat Map Component</span>
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

      {/* 5. Security Scan Diff Example */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <Shield size={14} className="text-rose-400" />
          <span>5. Security Incident Diff & Comparison</span>
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
