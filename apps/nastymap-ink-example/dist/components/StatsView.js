import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
export function StatsView({ scan }) {
    const totalHosts = scan.hosts.length;
    const upHosts = scan.hosts.filter((h) => h.status.state === 'up').length;
    let openPortsCount = 0;
    let closedPortsCount = 0;
    let filteredPortsCount = 0;
    const serviceCounts = new Map();
    const osCounts = new Map();
    for (const host of scan.hosts) {
        const osFam = host.osFamily || 'Unknown';
        osCounts.set(osFam, (osCounts.get(osFam) || 0) + 1);
        for (const p of host.ports) {
            if (p.state === 'open') {
                openPortsCount++;
                const sName = p.service?.name || `Port ${p.portid}`;
                serviceCounts.set(sName, (serviceCounts.get(sName) || 0) + 1);
            }
            else if (p.state === 'closed') {
                closedPortsCount++;
            }
            else if (p.state === 'filtered') {
                filteredPortsCount++;
            }
        }
    }
    const topServices = Array.from(serviceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const topOs = Array.from(osCounts.entries()).sort((a, b) => b[1] - a[1]);
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "single", borderColor: "gray", padding: 1, children: [_jsx(Box, { justifyContent: "space-between", marginBottom: 1, children: _jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDCCA Security Analytics & Threat Distribution" }) }), _jsxs(Box, { gap: 2, marginBottom: 1, children: [_jsxs(Box, { borderStyle: "round", borderColor: "cyan", paddingX: 1, flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "Targets Scanned" }), _jsxs(Text, { bold: true, color: "white", children: [totalHosts, " Hosts (", upHosts, " Up)"] })] }), _jsxs(Box, { borderStyle: "round", borderColor: "green", paddingX: 1, flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "Open Ports" }), _jsxs(Text, { bold: true, color: "green", children: [openPortsCount, " Active Services"] })] }), _jsxs(Box, { borderStyle: "round", borderColor: "yellow", paddingX: 1, flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "Filtered Ports" }), _jsx(Text, { bold: true, color: "yellow", children: filteredPortsCount })] }), _jsxs(Box, { borderStyle: "round", borderColor: "magenta", paddingX: 1, flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "Scan Duration" }), _jsx(Text, { bold: true, color: "magenta", children: scan.runstats?.finished.elapsed ? `${scan.runstats.finished.elapsed}s` : 'Completed' })] })] }), _jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "white", underline: true, children: "Operating System Distribution:" }), topOs.map(([osName, count]) => {
                        const barLength = Math.max(1, Math.round((count / totalHosts) * 20));
                        const bar = '█'.repeat(barLength);
                        return (_jsxs(Box, { paddingLeft: 2, gap: 1, children: [_jsx(Box, { width: 18, children: _jsx(Text, { color: "yellow", children: osName }) }), _jsx(Text, { color: "magenta", children: bar }), _jsxs(Text, { color: "white", children: ["(", count, ")"] })] }, osName));
                    })] }), _jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "white", underline: true, children: "Top Identified Network Services:" }), topServices.map(([sName, count]) => {
                        const barLength = Math.max(1, Math.round((count / (openPortsCount || 1)) * 20));
                        const bar = '█'.repeat(barLength);
                        return (_jsxs(Box, { paddingLeft: 2, gap: 1, children: [_jsx(Box, { width: 18, children: _jsx(Text, { color: "cyan", children: sName.toUpperCase() }) }), _jsx(Text, { color: "green", children: bar }), _jsxs(Text, { color: "white", children: ["(", count, ")"] })] }, sName));
                    })] })] }));
}
