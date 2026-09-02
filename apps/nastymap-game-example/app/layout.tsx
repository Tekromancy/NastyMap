import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NastyMap: Cyber Threat Hunter — Network Forensics Game',
  description:
    'Hunt rogue devices, Metasploit reverse shells, cryptominers, and ransomware pivots hidden amongst normal network devices.',
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
