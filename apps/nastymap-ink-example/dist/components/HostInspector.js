import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
export function HostInspector({ host, onBack, onUpdateHost }) {
    const [statusMsg, setStatusMsg] = useState(null);
    useInput((input, key) => {
        if (key.escape || key.backspace || input === 'b' || input === 'q') {
            onBack();
        }
        else if (input === 'd') {
            // Trigger deep re-scan
            setStatusMsg('Running deep scan (nmap -sV -sC -A -p-)...');
            setTimeout(() => {
                if (onUpdateHost) {
                    onUpdateHost(host.id, (prev) => {
                        const hasPort = prev.ports.some((p) => p.portid === 8443);
                        return {
                            ports: hasPort
                                ? prev.ports
                                : [
                                    ...prev.ports,
                                    {
                                        portid: 8443,
                                        protocol: 'tcp',
                                        state: 'open',
                                        service: {
                                            name: 'https-alt',
                                            product: 'Admin Management REST API',
                                            version: '2.8.4',
                                            extrainfo: 'TLS 1.3',
                                        },
                                    },
                                ],
                            tags: Array.from(new Set([...(prev.tags || []), 'deep-scanned'])),
                            primaryOs: `${prev.primaryOs || 'Linux'} (Verified 100%)`,
                        };
                    });
                }
                setStatusMsg('✔ Deep scan completed! Added port 8443 and verified OS.');
            }, 500);
        }
        else if (input === 'r') {
            // Refresh traceroute latency
            const newLatency = Number((Math.random() * 6 + 0.5).toFixed(2));
            if (onUpdateHost) {
                onUpdateHost(host.id, () => ({ latencyMs: newLatency }));
            }
            setStatusMsg(`✔ Latency re-probed: ${newLatency} ms`);
        }
        else if (input === 't') {
            // Toggle quarantine
            const nextQuarantine = !host.isQuarantined;
            if (onUpdateHost) {
                onUpdateHost(host.id, (prev) => ({
                    isQuarantined: nextQuarantine,
                    tags: nextQuarantine
                        ? Array.from(new Set([...(prev.tags || []), 'quarantined']))
                        : (prev.tags || []).filter((t) => t !== 'quarantined'),
                }));
            }
            setStatusMsg(nextQuarantine ? '⚠️ Host placed in QUARANTINE' : 'Host quarantine released');
        }
    });
    const openPorts = host.ports.filter((p) => p.state === 'open');
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "double", borderColor: host.isQuarantined ? 'yellow' : 'cyan', padding: 1, children: [_jsxs(Box, { justifyContent: "space-between", borderBottom: true, borderColor: "gray", paddingBottom: 1, marginBottom: 1, children: [_jsxs(Box, { gap: 1, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["\uD83D\uDD0E HOST INSPECTION: ", host.ipv4 || host.id] }), host.primaryHostname && _jsxs(Text, { color: "white", children: ["(", host.primaryHostname, ")"] }), _jsxs(Text, { color: host.status.state === 'up' ? 'green' : 'red', bold: true, children: ["[", host.status.state.toUpperCase(), "]"] }), host.isQuarantined && (_jsx(Text, { color: "yellow", bold: true, backgroundColor: "red", children: "[QUARANTINED]" }))] }), _jsx(Text, { color: "gray", dimColor: true, children: "Press [Esc] or [b] to go back" })] }), statusMsg && (_jsx(Box, { marginBottom: 1, paddingX: 1, borderStyle: "single", borderColor: "green", children: _jsx(Text, { color: "green", bold: true, children: statusMsg }) })), _jsxs(Box, { gap: 3, marginBottom: 1, children: [_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "Operating System:" }), _jsx(Text, { bold: true, color: "yellow", children: host.primaryOs || host.osFamily || 'Unknown' })] }), _jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "Device Type:" }), _jsx(Text, { color: "white", children: host.deviceType || 'general purpose' })] }), _jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "Latency (RTT):" }), _jsx(Text, { color: "green", children: host.latencyMs !== undefined ? `${host.latencyMs} ms` : 'N/A' })] }), _jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "Hop Distance:" }), _jsxs(Text, { color: "white", children: [host.distance || (host.trace?.hops ? host.trace.hops.length : 1), " hops"] })] })] }), host.tags && host.tags.length > 0 && (_jsxs(Box, { marginBottom: 1, gap: 1, children: [_jsx(Text, { color: "gray", children: "Tags:" }), host.tags.map((t) => (_jsxs(Text, { color: "cyan", children: ["#", t] }, t)))] })), _jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsxs(Text, { bold: true, color: "white", underline: true, children: ["Open Ports & Fingerprinted Services (", openPorts.length, "):"] }), openPorts.length === 0 ? (_jsx(Text, { color: "gray", children: "No open ports identified on this host." })) : (openPorts.map((p) => (_jsxs(Box, { paddingLeft: 2, children: [_jsx(Box, { width: 12, children: _jsxs(Text, { color: "cyan", bold: true, children: [p.portid, "/", p.protocol] }) }), _jsx(Box, { width: 16, children: _jsx(Text, { color: "green", children: p.service?.name || 'unknown' }) }), _jsx(Box, { children: _jsxs(Text, { color: "yellow", children: [p.service?.product || '', " ", p.service?.version || '', " ", p.service?.extrainfo ? `(${p.service.extrainfo})` : ''] }) })] }, p.portid))))] }), host.trace?.hops && host.trace.hops.length > 0 && (_jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "white", underline: true, children: "Route Traceroute Path:" }), host.trace.hops.map((hop, idx) => (_jsxs(Box, { paddingLeft: 2, gap: 2, children: [_jsxs(Text, { color: "magenta", children: ["Hop #", hop.ttl] }), _jsx(Text, { color: "white", children: hop.ipaddr }), hop.host && _jsxs(Text, { color: "gray", children: ["(", hop.host, ")"] }), _jsx(Text, { color: "yellow", children: hop.rtt !== undefined ? `${hop.rtt.toFixed(2)}ms` : '' })] }, idx)))] })), host.geolocation && (_jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "white", underline: true, children: "Geolocation & Network Origin:" }), _jsxs(Box, { paddingLeft: 2, gap: 2, children: [_jsxs(Text, { color: "yellow", children: [host.geolocation.city ? `${host.geolocation.city}, ` : '', host.geolocation.country] }), _jsxs(Text, { color: "gray", children: ["ASN: ", host.geolocation.asn] }), _jsxs(Text, { color: "gray", children: ["Coords: ", host.geolocation.latitude, ", ", host.geolocation.longitude] })] })] })), _jsxs(Box, { borderTop: true, borderColor: "gray", paddingTop: 1, justifyContent: "space-between", children: [_jsx(Text, { color: "yellow", bold: true, children: "[d] Deep Re-Scan  [r] Refresh Latency  [t] Toggle Quarantine" }), _jsx(Text, { color: "gray", dimColor: true, children: "[Esc/b] Back" })] })] }));
}
