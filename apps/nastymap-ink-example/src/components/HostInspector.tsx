import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { NmapHost } from 'nastymap';

export interface HostInspectorProps {
  host: NmapHost;
  onBack: () => void;
}

export function HostInspector({ host, onBack }: HostInspectorProps) {
  useInput((input, key) => {
    if (key.escape || key.backspace || input === 'b' || input === 'q') {
      onBack();
    }
  });

  const openPorts = host.ports.filter((p) => p.state === 'open');

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="cyan" padding={1}>
      {/* Header */}
      <Box justifyContent="space-between" borderBottom={true} borderColor="gray" paddingBottom={1} marginBottom={1}>
        <Box gap={1}>
          <Text bold color="cyan">
            🔎 HOST INSPECTION: {host.ipv4 || host.id}
          </Text>
          {host.primaryHostname && <Text color="white">({host.primaryHostname})</Text>}
          <Text color={host.status.state === 'up' ? 'green' : 'red'} bold>
            [{host.status.state.toUpperCase()}]
          </Text>
        </Box>
        <Text color="gray" dimColor>
          Press [Esc] or [b] to go back
        </Text>
      </Box>

      {/* Basic Host Details */}
      <Box gap={3} marginBottom={1}>
        <Box flexDirection="column">
          <Text color="gray">Operating System:</Text>
          <Text bold color="yellow">
            {host.primaryOs || host.osFamily || 'Unknown'}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text color="gray">Device Type:</Text>
          <Text color="white">{host.deviceType || 'general purpose'}</Text>
        </Box>

        <Box flexDirection="column">
          <Text color="gray">Latency (RTT):</Text>
          <Text color="green">{host.latencyMs !== undefined ? `${host.latencyMs} ms` : 'N/A'}</Text>
        </Box>

        <Box flexDirection="column">
          <Text color="gray">Hop Distance:</Text>
          <Text color="white">{host.distance || (host.trace?.hops ? host.trace.hops.length : 1)} hops</Text>
        </Box>
      </Box>

      {/* Open Ports & Services */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="white" underline>
          Open Ports & Fingerprinted Services ({openPorts.length}):
        </Text>
        {openPorts.length === 0 ? (
          <Text color="gray">No open ports identified on this host.</Text>
        ) : (
          openPorts.map((p) => (
            <Box key={p.portid} paddingLeft={2}>
              <Box width={12}>
                <Text color="cyan" bold>
                  {p.portid}/{p.protocol}
                </Text>
              </Box>
              <Box width={16}>
                <Text color="green">
                  {p.service?.name || 'unknown'}
                </Text>
              </Box>
              <Box>
                <Text color="yellow">
                  {p.service?.product || ''} {p.service?.version || ''} {p.service?.extrainfo ? `(${p.service.extrainfo})` : ''}
                </Text>
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Traceroute Hops */}
      {host.trace?.hops && host.trace.hops.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="white" underline>
            Route Traceroute Path:
          </Text>
          {host.trace.hops.map((hop, idx) => (
            <Box key={idx} paddingLeft={2} gap={2}>
              <Text color="magenta">Hop #{hop.ttl}</Text>
              <Text color="white">{hop.ipaddr}</Text>
              {hop.host && <Text color="gray">({hop.host})</Text>}
              <Text color="yellow">{hop.rtt !== undefined ? `${hop.rtt.toFixed(2)}ms` : ''}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Geolocation Details */}
      {host.geolocation && (
        <Box flexDirection="column">
          <Text bold color="white" underline>
            Geolocation & Network Origin:
          </Text>
          <Box paddingLeft={2} gap={2}>
            <Text color="yellow">
              {host.geolocation.city ? `${host.geolocation.city}, ` : ''}{host.geolocation.country}
            </Text>
            <Text color="gray">ASN: {host.geolocation.asn}</Text>
            <Text color="gray">Coords: {host.geolocation.latitude}, {host.geolocation.longitude}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
