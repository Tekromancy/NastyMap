import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { generateTopology } from 'nastymap';
function getOsBadgeColor(osFamily) {
    const fam = (osFamily || '').toLowerCase();
    if (fam.includes('linux') || fam.includes('ubuntu') || fam.includes('debian'))
        return 'green';
    if (fam.includes('windows') || fam.includes('microsoft'))
        return 'blue';
    if (fam.includes('cisco') || fam.includes('router') || fam.includes('switch'))
        return 'yellow';
    if (fam.includes('mac') || fam.includes('apple') || fam.includes('ios'))
        return 'magenta';
    if (fam.includes('bsd') || fam.includes('freebsd'))
        return 'red';
    return 'gray';
}
export function TopologyView({ scan, onSelectHost }) {
    const graph = React.useMemo(() => {
        return generateTopology(scan, { layout: 'traceroute' });
    }, [scan]);
    const targetNodes = graph.nodes.filter((n) => n.nodeType !== 'scanner');
    const [selectedIndex, setSelectedIndex] = useState(0);
    useInput((input, key) => {
        if (key.downArrow) {
            setSelectedIndex((prev) => (prev + 1) % targetNodes.length);
        }
        else if (key.upArrow) {
            setSelectedIndex((prev) => (prev - 1 + targetNodes.length) % targetNodes.length);
        }
        else if (key.return) {
            const selected = targetNodes[selectedIndex];
            if (selected && selected.hostRef) {
                onSelectHost(selected.hostRef);
            }
        }
    });
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "single", borderColor: "gray", padding: 1, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\u25C8 Network Topology & Traceroute Hierarchy Tree" }), _jsx(Text, { color: "gray", dimColor: true, children: "Use \u2191/\u2193 arrow keys to navigate \u00B7 Press Enter to inspect host" })] }), _jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { color: "magenta", bold: true, children: "[\u2B21 SCANNER ORIGIN]" }), _jsx(Text, { color: "gray", children: " 127.0.0.1 (Local Scanner Host)" })] }), _jsx(Box, { flexDirection: "column", children: targetNodes.map((node, idx) => {
                    const isSelected = selectedIndex === idx;
                    const isLast = idx === targetNodes.length - 1;
                    const prefix = isLast ? ' └─' : ' ├─';
                    const osColor = getOsBadgeColor(node.osFamily);
                    const openPortsStr = node.openPorts.length > 0
                        ? `[Ports: ${node.openPorts.slice(0, 5).join(', ')}${node.openPorts.length > 5 ? '...' : ''}]`
                        : '[No open ports]';
                    const hopStr = node.hopsAway > 0 ? `──(${node.hopsAway} hop${node.hopsAway > 1 ? 's' : ''}${node.latencyMs ? ` ${node.latencyMs}ms` : ''})──>` : '──>';
                    return (_jsxs(Box, { gap: 1, children: [_jsx(Text, { color: "cyan", children: prefix }), _jsx(Text, { color: "gray", children: hopStr }), _jsxs(Text, { bold: true, color: node.status === 'up' ? 'green' : 'red', inverse: isSelected, children: [isSelected ? '► ' : '', node.ip] }), node.hostname && (_jsxs(Text, { color: "white", children: ["(", node.hostname, ")"] })), _jsxs(Text, { color: osColor, children: ["[", node.osFamily, "]"] }), _jsx(Text, { color: "yellow", dimColor: true, children: openPortsStr }), _jsx(Text, { color: "gray", dimColor: true, children: node.deviceType }), isSelected && (_jsx(Text, { color: "cyan", bold: true, children: "\u25C4 [ENTER TO INSPECT]" }))] }, node.id));
                }) })] }));
}
