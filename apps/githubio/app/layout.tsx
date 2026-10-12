import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NastyMap — Interactive Nmap Topology, GeoIP, Diff & Cyber Threat Hunter',
  description:
    'Client-side visualization platform for Nmap XML scans: interactive force/radial topology, GeoIP world mapping, scan diffing, and the Cyber Threat Hunter incident response game.',
  keywords: [
    'Nmap',
    'Network Topology',
    'Cybersecurity',
    'Threat Hunter',
    'GeoIP',
    'Vulnerability Scanner',
    'Next.js',
    'React',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#050811] text-zinc-100" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
