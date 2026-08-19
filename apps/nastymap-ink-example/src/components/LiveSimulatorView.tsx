import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { NmapHost, NmapRun } from 'nastymap';
import { parseNmapXml, ENTERPRISE_NETWORK_XML } from 'nastymap';

export interface LiveSimulatorViewProps {
  onScanCompleted: (scan: NmapRun) => void;
}

export function LiveSimulatorView({ onScanCompleted }: LiveSimulatorViewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('Press [Space] to start live parallel scan simulation');
  const [streamedHosts, setStreamedHosts] = useState<NmapHost[]>([]);
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
      } else {
        clearInterval(timer);
        setIsRunning(false);
        onScanCompleted(fullScan);
      }
    }, 700);
  };

  const barFilled = '█'.repeat(Math.round(progress / 4));
  const barEmpty = '░'.repeat(25 - Math.round(progress / 4));

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">
          ⚡ Live Simulated Nmap Scan Runner
        </Text>
        <Text color="gray" dimColor>
          Press [Space] to start/restart scan
        </Text>
      </Box>

      {/* Progress Bar */}
      <Box flexDirection="column" marginBottom={1}>
        <Box gap={1}>
          <Text color="yellow" bold>
            [{barFilled}{barEmpty}] {progress}%
          </Text>
          <Text color={isRunning ? 'cyan' : 'green'} bold>
            {phase}
          </Text>
        </Box>
      </Box>

      {/* Streamed Hosts List */}
      <Box flexDirection="column">
        <Text bold color="white" underline>
          Discovered Active Targets ({streamedHosts.length}/{fullScan.hosts.length}):
        </Text>
        {streamedHosts.map((h) => (
          <Box key={h.id} paddingLeft={2} gap={2}>
            <Text color="green" bold>
              ● {h.ipv4 || h.id}
            </Text>
            {h.primaryHostname && <Text color="white">({h.primaryHostname})</Text>}
            <Text color="yellow">[{h.primaryOs || h.osFamily || 'Unknown'}]</Text>
            <Text color="cyan">
              {h.ports.filter((p) => p.state === 'open').length} open ports
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
