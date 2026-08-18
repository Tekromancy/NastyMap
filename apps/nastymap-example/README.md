# nastymap-example

> Flagship Next.js 16 + React 19 web application demonstrating the capabilities of the `nastymap` library.

## Running Locally

```bash
# From repository root
pnpm dev
# or from this directory
pnpm --filter nastymap-example dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features Demonstrated

1. **Network Topology Graph**: Interactive 2D physics, Traceroute Route Tree, Concentric Radial, and Subnet Grid layouts.
2. **Geographic Threat Map**: Geocoded vector world map with flight paths and cluster pins.
3. **Security Incident Diff**: Compare baseline scans against post-incident scans.
4. **Live Scan Simulator**: Real-time interactive terminal with progress bar and partial discovery streaming.
5. **Host Directory & Port Table**: Searchable, multi-column sortable table with CSV export.
6. **Security Analytics**: Port state breakdown, OS distribution, and top services.
7. **SVG / PNG / HTML Report Exporting**: High resolution downloads.
8. **Interactive Developer Playground**: Live copyable integration code snippets.

## Building for Production

```bash
pnpm build
pnpm start
```
