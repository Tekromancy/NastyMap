import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { NmapHost, NmapRun } from 'nastymap';
import { parseNmapXml, updateHostInScan, SAMPLE_SCANS } from 'nastymap';
import { Header } from './Header';
import { TabBar, TabId } from './TabBar';
import { TopologyView } from './TopologyView';
import { WorldMapView } from './WorldMapView';
import { DiffView } from './DiffView';
import { HostDirectoryView } from './HostDirectoryView';
import { StatsView } from './StatsView';
import { LiveSimulatorView } from './LiveSimulatorView';
import { HostInspector } from './HostInspector';

export interface AppProps {
  initialScan?: NmapRun;
  initialScanLabel?: string;
  initialTab?: TabId;
  diffScanA?: NmapRun;
  diffScanB?: NmapRun;
}

export function App({
  initialScan,
  initialScanLabel = 'Enterprise Multi-Subnet',
  initialTab = 'topology',
  diffScanA,
  diffScanB,
}: AppProps) {
  const { exit } = useApp();
  const [currentScan, setCurrentScan] = useState<NmapRun>(() => {
    return initialScan || parseNmapXml(SAMPLE_SCANS.enterprise.xml);
  });
  const [activeScanLabel, setActiveScanLabel] = useState<string>(initialScanLabel);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [selectedHost, setSelectedHost] = useState<NmapHost | null>(null);

  const handleUpdateHost = (hostId: string, updater: (prev: NmapHost) => NmapHost | Partial<NmapHost>) => {
    setCurrentScan((prev) => {
      const updated = updateHostInScan(prev, hostId, updater);
      setSelectedHost((curr) => {
        if (!curr) return null;
        const matching = updated.hosts.find((h) => h.id === curr.id || h.ipv4 === curr.ipv4);
        return matching || curr;
      });
      return updated;
    });
  };

  useInput((input, key) => {
    if (input === 'q' && !selectedHost) {
      exit();
    } else if (input === '1') {
      setActiveTab('topology');
      setSelectedHost(null);
    } else if (input === '2') {
      setActiveTab('geo');
      setSelectedHost(null);
    } else if (input === '3') {
      setActiveTab('diff');
      setSelectedHost(null);
    } else if (input === '4') {
      setActiveTab('hosts');
      setSelectedHost(null);
    } else if (input === '5') {
      setActiveTab('stats');
      setSelectedHost(null);
    } else if (input === '6') {
      setActiveTab('live');
      setSelectedHost(null);
    } else if (input === 's' && !selectedHost) {
      // Cycle through sample scans
      if (activeScanLabel.includes('Enterprise')) {
        setCurrentScan(parseNmapXml(SAMPLE_SCANS.global.xml));
        setActiveScanLabel('Global Cloud Perimeter');
      } else {
        setCurrentScan(parseNmapXml(SAMPLE_SCANS.enterprise.xml));
        setActiveScanLabel('Enterprise Multi-Subnet');
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header Banner */}
      <Header scan={currentScan} activeScanLabel={activeScanLabel} />

      {/* Tabs */}
      <TabBar activeTab={activeTab} />

      {/* View Content */}
      {selectedHost ? (
        <HostInspector
          host={selectedHost}
          onBack={() => setSelectedHost(null)}
          onUpdateHost={handleUpdateHost}
        />
      ) : (
        <>
          {activeTab === 'topology' && (
            <TopologyView scan={currentScan} onSelectHost={(host) => setSelectedHost(host)} />
          )}

          {activeTab === 'geo' && (
            <WorldMapView scan={currentScan} onSelectHost={(host) => setSelectedHost(host)} />
          )}

          {activeTab === 'diff' && <DiffView scanA={diffScanA} scanB={diffScanB} />}

          {activeTab === 'hosts' && (
            <HostDirectoryView scan={currentScan} onSelectHost={(host) => setSelectedHost(host)} />
          )}

          {activeTab === 'stats' && <StatsView scan={currentScan} />}

          {activeTab === 'live' && (
            <LiveSimulatorView
              onScanCompleted={(newScan) => {
                setCurrentScan(newScan);
                setActiveScanLabel('Live Discovered Scan');
                setActiveTab('topology');
              }}
            />
          )}
        </>
      )}

      {/* Bottom Footer Info */}
      <Box marginTop={1} justifyContent="space-between">
        <Text color="gray" dimColor>
          Press [1-6] for tabs · [s] switch sample · [q] quit
        </Text>
        <Text color="cyan" dimColor>
          NastyMap CLI v1.0.0
        </Text>
      </Box>
    </Box>
  );
}
