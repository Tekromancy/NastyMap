import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
export function HostDirectoryView({ scan, onSelectHost }) {
    const hosts = scan.hosts;
    const [selectedIndex, setSelectedIndex] = useState(0);
    useInput((input, key) => {
        if (key.downArrow) {
            setSelectedIndex((prev) => (prev + 1) % hosts.length);
        }
        else if (key.upArrow) {
            setSelectedIndex((prev) => (prev - 1 + hosts.length) % hosts.length);
        }
        else if (key.return) {
            const selected = hosts[selectedIndex];
            if (selected) {
                onSelectHost(selected);
            }
        }
    });
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "single", borderColor: "gray", padding: 1, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDCCB Discovered Host Directory & Service Catalog" }), _jsx(Text, { color: "gray", dimColor: true, children: "Use \u2191/\u2193 arrow keys \u00B7 Press Enter to inspect" })] }), _jsxs(Box, { borderBottom: true, borderColor: "gray", paddingBottom: 0, marginBottom: 1, children: [_jsx(Box, { width: 18, children: _jsx(Text, { bold: true, color: "white", children: "IP Address" }) }), _jsx(Box, { width: 12, children: _jsx(Text, { bold: true, color: "white", children: "Status" }) }), _jsx(Box, { width: 28, children: _jsx(Text, { bold: true, color: "white", children: "Hostname" }) }), _jsx(Box, { width: 26, children: _jsx(Text, { bold: true, color: "white", children: "Operating System" }) }), _jsx(Box, { children: _jsx(Text, { bold: true, color: "white", children: "Open Ports" }) })] }), hosts.map((host, idx) => {
                const isSelected = selectedIndex === idx;
                const openPorts = host.ports.filter((p) => p.state === 'open');
                const openPortsStr = openPorts.length > 0
                    ? openPorts.map((p) => `${p.portid}/${p.protocol}`).slice(0, 4).join(', ') + (openPorts.length > 4 ? ` +${openPorts.length - 4}` : '')
                    : '-';
                return (_jsxs(Box, { children: [_jsx(Box, { width: 18, children: _jsxs(Text, { bold: true, color: isSelected ? 'black' : 'white', backgroundColor: isSelected ? 'cyan' : undefined, children: [isSelected ? '► ' : '  ', host.ipv4 || host.id] }) }), _jsx(Box, { width: 12, children: _jsx(Text, { color: host.status.state === 'up' ? 'green' : 'red', children: host.status.state.toUpperCase() }) }), _jsx(Box, { width: 28, children: _jsx(Text, { color: "white", children: host.primaryHostname || '-' }) }), _jsx(Box, { width: 26, children: _jsx(Text, { color: "yellow", children: host.primaryOs || host.osFamily || 'Unknown' }) }), _jsx(Box, { children: _jsx(Text, { color: "cyan", children: openPortsStr }) })] }, host.id));
            })] }));
}
