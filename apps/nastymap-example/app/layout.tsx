import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NastyMap — Nmap Graphical Topology, GeoIP & Threat Visualizer',
  description:
    'Interactive network topology diagrams, traceroute hierarchy trees, radial concentric maps, GeoIP world mapping, and security scan diffing from Nmap XML output.',
  keywords: ['Nmap', 'Network Mapper', 'Cybersecurity', 'Topology', 'Traceroute', 'GeoIP', 'Vulnerability', 'Port Scanner'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#050811] text-zinc-100">{children}</body>
    </html>
  );
}
