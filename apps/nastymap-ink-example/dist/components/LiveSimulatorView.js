import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { parseNmapXml, ENTERPRISE_NETWORK_XML } from 'nastymap';
export function LiveSimulatorView({ onScanCompleted }) {
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState('Press [Space] to start live parallel scan simulation');
    const [streamedHosts, setStreamedHosts] = useState([]);
    const fullScan = React.useMemo(() => parseNmapXml(ENTERPRISE_NETWORK_XML), []);
    useInput((input, key) => {
        if (input === ' ' && !isRunning) {
            startScan();
        }
    });
    const startScan = () => {
        setIsRunning(true);
        setProgress(0);
        setStreamedHosts([]);
        const steps = [
            { p: 20, text: 'Phase 1/5: Initiating ARP Discovery Ping...' },
            { p: 40, text: 'Phase 2/5: Parallel SYN Stealth Scanning on 1000 ports...' },
            { p: 65, text: 'Phase 3/5: Probing Service Banners & Application Versions...' },
            { p: 85, text: 'Phase 4/5: Matching OS TCP/IP Fingerprints...' },
            { p: 95, text: 'Phase 5/5: Executing Parallel Traceroute Hops...' },
            { p: 100, text: '✔ Scan Completed Successfully! Updated network topology.' },
        ];
        let current = 0;
        const timer = setInterval(() => {
            if (current < steps.length) {
                const s = steps[current];
                setProgress(s.p);
                setPhase(s.text);
                const count = Math.ceil((s.p / 100) * fullScan.hosts.length);
                setStreamedHosts(fullScan.hosts.slice(0, count));
                current++;
            }
            else {
                clearInterval(timer);
                setIsRunning(false);
                onScanCompleted(fullScan);
            }
        }, 700);
    };
    const barFilled = '█'.repeat(Math.round(progress / 4));
    const barEmpty = '░'.repeat(25 - Math.round(progress / 4));
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "single", borderColor: "gray", padding: 1, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\u26A1 Live Simulated Nmap Scan Runner" }), _jsx(Text, { color: "gray", dimColor: true, children: "Press [Space] to start/restart scan" })] }), _jsx(Box, { flexDirection: "column", marginBottom: 1, children: _jsxs(Box, { gap: 1, children: [_jsxs(Text, { color: "yellow", bold: true, children: ["[", barFilled, barEmpty, "] ", progress, "%"] }), _jsx(Text, { color: isRunning ? 'cyan' : 'green', bold: true, children: phase })] }) }), _jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { bold: true, color: "white", underline: true, children: ["Discovered Active Targets (", streamedHosts.length, "/", fullScan.hosts.length, "):"] }), streamedHosts.map((h) => (_jsxs(Box, { paddingLeft: 2, gap: 2, children: [_jsxs(Text, { color: "green", bold: true, children: ["\u25CF ", h.ipv4 || h.id] }), h.primaryHostname && _jsxs(Text, { color: "white", children: ["(", h.primaryHostname, ")"] }), _jsxs(Text, { color: "yellow", children: ["[", h.primaryOs || h.osFamily || 'Unknown', "]"] }), _jsxs(Text, { color: "cyan", children: [h.ports.filter((p) => p.state === 'open').length, " open ports"] })] }, h.id)))] })] }));
}
