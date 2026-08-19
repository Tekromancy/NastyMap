# NastyMap (Nmap Graphical Display & Threat Visualizer)

> **NastyMap** is a high-performance monorepo featuring an interactive React/TypeScript network visualization library (`packages/nastymap`) and a flagship Next.js application (`apps/nastymap-example`) for parsing, mapping, geocoding, and visualizing Nmap XML scan outputs.

![NastyMap Banner](https://img.shields.io/badge/NastyMap-v1.0.0-blue?style=for-the-badge&logo=nmap)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Overview

If Nmap is called the **Network Mapper**, it should generate a stunning map! NastyMap transforms raw Nmap XML files into interactive, aesthetic diagrams and geographic threat visualizations using:
- **Target OS Detection** (Linux, Windows, macOS, Cisco IOS, BSD, Android)
- **Port Scanning & Service Versioning** (HTTP, SSH, Kerberos, SMB, RDP, MySQL, etc.)
- **Parallel Traceroute Routing & Latency Graphs** (Intermediate hop discovery & RTT measurements)
- **Geographic IP Mapping (GeoIP)** (Interactive world map overlay with flight arcs)
- **Scan Diffing & Breach Incident Analysis** (Compare baseline scans against compromised states)
- **Live Scan Runner Simulation** (Streaming discovery progress bar & real-time topology updates)
- **Multi-Format Export** (SVG vector, high-res PNG, and standalone HTML reports)

This was inspired in response to a [proposal](https://nmap.org/soc/NmapDiag.html) for google summer of code. 

---

## 📁 Repository Structure

```
NastyMap/
├── packages/
│   └── nastymap/             # The core reusable React/TypeScript library
│       ├── src/
│       │   ├── parser/       # Robust Nmap XML parser (fast-xml-parser)
│       │   ├── topology/     # Graph engine (Force 2D, Traceroute Tree, Radial, Subnets)
│       │   ├── geoip/        # IP geocoding & world map coordinate resolver
│       │   ├── diff/         # Scan comparison engine (Added/Removed/Modified)
│       │   ├── export/       # SVG, PNG, and standalone HTML report generator
│       │   ├── components/   # React components (<NmapTopologyView />, <NmapGeoMap />, etc.)
│       │   ├── icons/        # Custom OS and device icon registry
│       │   ├── hooks/        # Custom React hooks (useNmapScan)
│       │   └── data/         # Sample scans (Enterprise, Global GeoIP, Breach Diff)
│       └── test/             # Vitest automated test suite
├── apps/
│   └── nastymap-example/     # Flagship Next.js 16 + React 19 App Router showcase
│       ├── app/              # Cyber-ops UI, dark/light theme, full interactive views
│       └── components/       # Live scanner simulator & interactive developer playground
├── docs/
│   └── nastymap.1.xml        # DocBook XML man page (compatible with nroff & HTML)
└── installer/
    └── nastymap.nsi          # NSIS Windows installer script
```

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run the Flagship Example App
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Automated Tests
```bash
pnpm test
```

### 4. Build for Production
```bash
pnpm build
```

---

## 💡 Using `nastymap` in Your Own Projects

Install the library:
```bash
npm install nastymap lucide-react
# or
pnpm add nastymap lucide-react
```

### Network Topology Component
```tsx
import React from 'react';
import { NmapTopologyView, parseNmapXml } from 'nastymap';

export function App({ xmlContent }: { xmlContent: string }) {
  const scan = parseNmapXml(xmlContent);

  return (
    <NmapTopologyView
      scan={scan}
      initialLayout="force" // 'force' | 'traceroute' | 'radial' | 'subnet'
      onSelectHost={(host) => console.log('Inspecting:', host.id)}
    />
  );
}
```

### Geographic IP Map Component
```tsx
import React from 'react';
import { NmapGeoMap, parseNmapXml } from 'nastymap';

export function ThreatMap({ xmlContent }: { xmlContent: string }) {
  const scan = parseNmapXml(xmlContent);

  return <NmapGeoMap scan={scan} />;
}
```

### Security Diff Component
```tsx
import React from 'react';
import { NmapDiffView, parseNmapXml } from 'nastymap';

export function ScanDiff({ scanXmlBefore, scanXmlAfter }) {
  return (
    <NmapDiffView
      scanA={parseNmapXml(scanXmlBefore)}
      scanB={parseNmapXml(scanXmlAfter)}
    />
  );
}
```

---

## 📜 DocBook XML Man Page & NSIS Windows Installer

- **DocBook Man Page**: [`docs/nastymap.1.xml`](docs/nastymap.1.xml) conforms to standard DocBook XML 4.5 format.
- **Windows Installer**: [`installer/nastymap.nsi`](installer/nastymap.nsi) provides an NSIS script for packaging Windows installers with file associations and uninstaller.

---

## 🛡️ License

MIT License © 2026 NastyMap Team
