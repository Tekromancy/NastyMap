import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { geocodeIp } from 'nastymap';
// Compact ASCII World Map representation
const ASCII_WORLD_MAP = [
    '  . _..----.._    _             ______                   .-.            ',
    ' /"          "-./ "-.          /      "-.._    _.-.    _/ /             ',
    ':  NORTH         "-._)        :  EUROPE    "/\'    " -/  /   ASIA       ',
    '|  AMERICA           |         \\_           /       /  /                ',
    '|                    |           "-._    _.-"       |  |                ',
    ' \\                  /                / /            |  |                ',
    '  "-._            _."               / /   AFRICA    |  |                ',
    '      "-..____..-"                 / /              /  /                ',
    '           / /                    (_/              /  /   AUSTRALIA     ',
    '    SOUTH / /                                     (__/                  ',
    '   AMERICA_/                                                            ',
];
export function WorldMapView({ scan, onSelectHost }) {
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
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "single", borderColor: "gray", padding: 1, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83C\uDF10 Global IP Geolocation & Threat Map" }), _jsx(Text, { color: "gray", dimColor: true, children: "Use \u2191/\u2193 arrow keys \u00B7 Press Enter to inspect host" })] }), _jsx(Box, { flexDirection: "column", marginBottom: 1, paddingX: 1, borderStyle: "round", borderColor: "blue", children: ASCII_WORLD_MAP.map((line, idx) => (_jsx(Text, { color: "cyan", dimColor: true, children: line }, idx))) }), _jsxs(Box, { flexDirection: "column", children: [_jsxs(Box, { borderBottom: true, borderColor: "gray", paddingBottom: 0, marginBottom: 1, children: [_jsx(Box, { width: 18, children: _jsx(Text, { bold: true, color: "white", children: "IP Address" }) }), _jsx(Box, { width: 16, children: _jsx(Text, { bold: true, color: "white", children: "Country" }) }), _jsx(Box, { width: 18, children: _jsx(Text, { bold: true, color: "white", children: "City / Region" }) }), _jsx(Box, { width: 26, children: _jsx(Text, { bold: true, color: "white", children: "Organization / ASN" }) }), _jsx(Box, { children: _jsx(Text, { bold: true, color: "white", children: "Latency" }) })] }), hosts.map((host, idx) => {
                        const isSelected = selectedIndex === idx;
                        const geo = host.geolocation || geocodeIp(host.ipv4 || host.id);
                        const ip = host.ipv4 || host.id;
                        return (_jsxs(Box, { children: [_jsx(Box, { width: 18, children: _jsxs(Text, { bold: true, color: isSelected ? 'black' : 'green', backgroundColor: isSelected ? 'cyan' : undefined, children: [isSelected ? '► ' : '  ', ip] }) }), _jsx(Box, { width: 16, children: _jsxs(Text, { color: "yellow", children: [geo.country || 'Unknown', " [", geo.countryCode || 'UN', "]"] }) }), _jsx(Box, { width: 18, children: _jsx(Text, { color: "white", children: geo.city || 'Internal Subnet' }) }), _jsx(Box, { width: 26, children: _jsx(Text, { color: "gray", children: geo.org || geo.isp || 'Enterprise LAN' }) }), _jsx(Box, { children: _jsx(Text, { color: host.latencyMs && host.latencyMs > 100 ? 'red' : 'green', children: host.latencyMs !== undefined ? `${host.latencyMs} ms` : '-' }) })] }, host.id));
                    })] })] }));
}
