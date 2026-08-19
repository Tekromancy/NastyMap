import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { parseNmapXml, updateHostInScan, SAMPLE_SCANS } from 'nastymap';
import { Header } from './Header';
import { TabBar } from './TabBar';
import { TopologyView } from './TopologyView';
import { WorldMapView } from './WorldMapView';
import { DiffView } from './DiffView';
import { HostDirectoryView } from './HostDirectoryView';
import { StatsView } from './StatsView';
import { LiveSimulatorView } from './LiveSimulatorView';
import { HostInspector } from './HostInspector';
export function App({ initialScan, initialScanLabel = 'Enterprise Multi-Subnet', initialTab = 'topology', diffScanA, diffScanB, }) {
    const { exit } = useApp();
    const [currentScan, setCurrentScan] = useState(() => {
        return initialScan || parseNmapXml(SAMPLE_SCANS.enterprise.xml);
    });
    const [activeScanLabel, setActiveScanLabel] = useState(initialScanLabel);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [selectedHost, setSelectedHost] = useState(null);
    const handleUpdateHost = (hostId, updater) => {
        setCurrentScan((prev) => {
            const updated = updateHostInScan(prev, hostId, updater);
            setSelectedHost((curr) => {
                if (!curr)
                    return null;
                const matching = updated.hosts.find((h) => h.id === curr.id || h.ipv4 === curr.ipv4);
                return matching || curr;
            });
            return updated;
        });
    };
    useInput((input, key) => {
        if (input === 'q' && !selectedHost) {
            exit();
        }
        else if (input === '1') {
            setActiveTab('topology');
            setSelectedHost(null);
        }
        else if (input === '2') {
            setActiveTab('geo');
            setSelectedHost(null);
        }
        else if (input === '3') {
            setActiveTab('diff');
            setSelectedHost(null);
        }
        else if (input === '4') {
            setActiveTab('hosts');
            setSelectedHost(null);
        }
        else if (input === '5') {
            setActiveTab('stats');
            setSelectedHost(null);
        }
        else if (input === '6') {
            setActiveTab('live');
            setSelectedHost(null);
        }
        else if (input === 's' && !selectedHost) {
            // Cycle through sample scans
            if (activeScanLabel.includes('Enterprise')) {
                setCurrentScan(parseNmapXml(SAMPLE_SCANS.global.xml));
                setActiveScanLabel('Global Cloud Perimeter');
            }
            else {
                setCurrentScan(parseNmapXml(SAMPLE_SCANS.enterprise.xml));
                setActiveScanLabel('Enterprise Multi-Subnet');
            }
        }
    });
    return (_jsxs(Box, { flexDirection: "column", padding: 1, children: [_jsx(Header, { scan: currentScan, activeScanLabel: activeScanLabel }), _jsx(TabBar, { activeTab: activeTab }), selectedHost ? (_jsx(HostInspector, { host: selectedHost, onBack: () => setSelectedHost(null), onUpdateHost: handleUpdateHost })) : (_jsxs(_Fragment, { children: [activeTab === 'topology' && (_jsx(TopologyView, { scan: currentScan, onSelectHost: (host) => setSelectedHost(host) })), activeTab === 'geo' && (_jsx(WorldMapView, { scan: currentScan, onSelectHost: (host) => setSelectedHost(host) })), activeTab === 'diff' && _jsx(DiffView, { scanA: diffScanA, scanB: diffScanB }), activeTab === 'hosts' && (_jsx(HostDirectoryView, { scan: currentScan, onSelectHost: (host) => setSelectedHost(host) })), activeTab === 'stats' && _jsx(StatsView, { scan: currentScan }), activeTab === 'live' && (_jsx(LiveSimulatorView, { onScanCompleted: (newScan) => {
                            setCurrentScan(newScan);
                            setActiveScanLabel('Live Discovered Scan');
                            setActiveTab('topology');
                        } }))] })), _jsxs(Box, { marginTop: 1, justifyContent: "space-between", children: [_jsx(Text, { color: "gray", dimColor: true, children: "Press [1-6] for tabs \u00B7 [s] switch sample \u00B7 [q] quit" }), _jsx(Text, { color: "cyan", dimColor: true, children: "NastyMap CLI v1.0.0" })] })] }));
}
