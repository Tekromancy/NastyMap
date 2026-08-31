import { NextResponse } from 'next/server';
import * as os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export interface NetworkInterfaceInfo {
  name: string;
  ip: string;
  netmask: string;
  prefixLength: number;
  networkCidr: string;
  networkIp: string;
  broadcast?: string;
  mac?: string;
  isInternal: boolean;
  family: 'IPv4' | 'IPv6';
  operstate?: string;
  suggestedCommands: {
    fastPingScan: string;
    fastPortScan: string;
    standardAudit: string;
    singleHostScan: string;
  };
}

/**
 * Calculates the bitwise network address and prefix length for an IPv4 address & netmask.
 * Example: IP 192.168.0.112 + Netmask 255.255.255.0 => Network 192.168.0.0, Prefix 24 => 192.168.0.0/24
 */
function calculateIpv4Cidr(ip: string, netmask: string): { networkCidr: string; prefixLength: number; networkIp: string } {
  const ipParts = ip.split('.').map(Number);
  const maskParts = netmask.split('.').map(Number);

  if (ipParts.length !== 4 || maskParts.length !== 4) {
    return { networkCidr: `${ip}/32`, prefixLength: 32, networkIp: ip };
  }

  const netParts = ipParts.map((part, i) => part & (maskParts[i] ?? 255));
  const prefixLength = maskParts.reduce((acc, octet) => {
    return acc + (octet.toString(2).match(/1/g) || []).length;
  }, 0);

  const networkIp = netParts.join('.');
  return {
    networkCidr: `${networkIp}/${prefixLength}`,
    prefixLength,
    networkIp,
  };
}

export async function GET() {
  try {
    const rawInterfaces = os.networkInterfaces();
    const result: NetworkInterfaceInfo[] = [];

    // Attempt to gather operstate from `ip -j addr` on Linux systems
    const ipAddrStateMap = new Map<string, { operstate?: string; broadcast?: string }>();
    try {
      const { stdout } = await execAsync('ip -j addr', { timeout: 1500 });
      const parsed = JSON.parse(stdout);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.ifname) {
            const inetInfo = item.addr_info?.find((a: any) => a.family === 'inet');
            ipAddrStateMap.set(item.ifname, {
              operstate: item.operstate,
              broadcast: inetInfo?.broadcast,
            });
          }
        }
      }
    } catch {
      // Fallback if ip command is not available or not Linux
    }

    for (const [ifName, addrs] of Object.entries(rawInterfaces)) {
      if (!addrs) continue;

      for (const addr of addrs) {
        // We focus primarily on IPv4 for network CIDR subnet generation
        if (addr.family === 'IPv4' || (addr as any).family === 4) {
          const { networkCidr, prefixLength, networkIp } = calculateIpv4Cidr(addr.address, addr.netmask);
          const extraInfo = ipAddrStateMap.get(ifName);

          result.push({
            name: ifName,
            ip: addr.address,
            netmask: addr.netmask,
            prefixLength,
            networkCidr,
            networkIp,
            broadcast: extraInfo?.broadcast,
            mac: addr.mac,
            isInternal: addr.internal,
            family: 'IPv4',
            operstate: extraInfo?.operstate || (addr.internal ? 'LOOPBACK' : 'UP'),
            suggestedCommands: {
              fastPingScan: `nmap -sn ${networkCidr}`,
              fastPortScan: `nmap -F ${networkCidr}`,
              standardAudit: `nmap -sV -T4 ${networkCidr}`,
              singleHostScan: `nmap -sV -F ${addr.address}`,
            },
          });
        }
      }
    }

    // Sort: active non-internal interfaces first (e.g. eth0, wlan0), then loopback
    result.sort((a, b) => {
      if (a.isInternal && !b.isInternal) return 1;
      if (!a.isInternal && b.isInternal) return -1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      interfaces: result,
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to detect network interfaces' },
      { status: 500 }
    );
  }
}
