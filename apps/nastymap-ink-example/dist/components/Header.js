import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
export function Header({ scan, activeScanLabel }) {
    const upHosts = scan.hosts.filter((h) => h.status.state === 'up').length;
    const totalOpenPorts = scan.hosts.reduce((acc, h) => acc + h.ports.filter((p) => p.state === 'open').length, 0);
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", paddingX: 1, marginBottom: 1, children: [_jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Box, { gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "NASTYMAP CLI" }), _jsx(Text, { color: "gray", children: "|" }), _jsx(Text, { color: "white", bold: true, children: activeScanLabel })] }), _jsxs(Box, { gap: 1, children: [_jsxs(Text, { color: "green", bold: true, children: ["\u25CF ", upHosts, "/", scan.hosts.length, " Hosts Online"] }), _jsx(Text, { color: "gray", children: "|" }), _jsxs(Text, { color: "yellow", bold: true, children: [totalOpenPorts, " Ports"] }), _jsx(Text, { color: "gray", children: "|" }), _jsxs(Text, { color: "gray", children: ["Nmap v", scan.version] })] })] }), _jsx(Box, { marginTop: 0, children: _jsxs(Text, { color: "gray", dimColor: true, children: ["Command: ", scan.args, " (", scan.startstr, ")"] }) })] }));
}
