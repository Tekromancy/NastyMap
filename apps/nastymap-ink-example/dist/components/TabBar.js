import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text } from 'ink';
const TABS = [
    { id: 'topology', keyNum: '1', label: 'Topology Tree' },
    { id: 'geo', keyNum: '2', label: 'World Geo Map' },
    { id: 'diff', keyNum: '3', label: 'Scan Diff' },
    { id: 'hosts', keyNum: '4', label: 'Host Directory' },
    { id: 'stats', keyNum: '5', label: 'Security Stats' },
    { id: 'live', keyNum: '6', label: 'Live Scanner' },
];
export function TabBar({ activeTab }) {
    return (_jsxs(Box, { gap: 1, marginBottom: 1, flexWrap: "wrap", children: [TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (_jsx(Box, { borderStyle: isActive ? 'bold' : 'single', borderColor: isActive ? 'cyan' : 'gray', paddingX: 1, children: _jsxs(Text, { color: isActive ? 'cyan' : 'white', bold: isActive, children: ["[", tab.keyNum, "] ", tab.label] }) }, tab.id));
            }), _jsx(Box, { borderStyle: "single", borderColor: "gray", paddingX: 1, children: _jsx(Text, { color: "gray", children: "[q] Quit" }) })] }));
}
