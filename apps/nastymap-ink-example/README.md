# nastymap-ink-example

> Interactive Terminal User Interface (TUI) for Nmap scan visualization built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs) and the `nastymap` library.

## ✨ Features

- **Interactive Topology Tree**: ASCII / Unicode hierarchy route tree with traceroute hops, OS color badges, latency measurements, and open port pills.
- **ASCII World Geo Threat Map**: Geocoded IP locations, country flags, organizations, and ASN directory on a 2D terminal map.
- **Security Scan Diff & Changelog**: Side-by-side incident analysis showing newly discovered hosts (`+`), removed hosts (`-`), and opened backdoors (`~`).
- **Keyboard-Navigable Host Directory**: Scrollable table with instant Enter-to-inspect host modal.
- **Host Inspector Drawer**: Detailed view for any host (open ports, CPEs, OS detection accuracy %, traceroute hops timeline, and notes).
- **Security Analytics**: Terminal ASCII bar charts for port states, operating systems, and top services.
- **Live Scan Simulator**: Real-time progress bar, animated phase indicators, and streaming host discovery.
- **Headless HTML Report Exporter**: Generate standalone HTML security reports from the command line (`--export-html <file.html>`).

## 🚀 Usage

### Run with Preset Samples
```bash
# Run interactive TUI with enterprise preset
pnpm --filter nastymap-ink-example start

# Or with global cloud perimeter preset
pnpm --filter nastymap-ink-example start --sample global

# Or launch directly into scan diff mode
pnpm --filter nastymap-ink-example start --tab diff
```

### Run with Custom XML Scan
```bash
# Pass any Nmap XML scan file
pnpm --filter nastymap-ink-example start /path/to/scan.xml

# Compare two XML scans
pnpm --filter nastymap-ink-example start --diff baseline.xml compromised.xml

# Headless HTML export
pnpm --filter nastymap-ink-example start scan.xml --export-html report.html
```

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `1` | Switch to **Topology Tree** |
| `2` | Switch to **World Geo Map** |
| `3` | Switch to **Scan Diff & Changelog** |
| `4` | Switch to **Host Directory** |
| `5` | Switch to **Security Analytics** |
| `6` | Switch to **Live Scan Simulator** |
| `↑` / `↓` | Navigate hosts in list / tree |
| `Enter` | Inspect selected host |
| `Esc` / `b` | Return from host inspector |
| `s` | Cycle through preset sample scans |
| `Space` | Start / restart live scan simulator |
| `q` | Quit application |

## 📦 Building

```bash
pnpm --filter nastymap-ink-example build
```
