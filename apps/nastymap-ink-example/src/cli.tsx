#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import fs from 'node:fs';
import path from 'node:path';
import { parseNmapXml, generateTopology, generateHtmlReport, SAMPLE_SCANS } from 'nastymap';
import type { NmapRun } from 'nastymap';
import { App } from './components/App';
import type { TabId } from './components/TabBar';

const cli = meow(
  `
  Usage
    $ nastymap-cli [file.xml]

  Options
    --sample, -s       Load a preset sample: enterprise, global, breachDiff
    --tab, -t          Initial active tab: topology, geo, diff, hosts, stats, live
    --diff, -d         Compare two XML files: --diff <baseline.xml> <current.xml>
    --export-html, -e  Generate standalone HTML report to output file without launching TUI

  Examples
    $ nastymap-cli scan.xml
    $ nastymap-cli --sample global
    $ nastymap-cli --diff scan_before.xml scan_after.xml
    $ nastymap-cli scan.xml --export-html report.html
`,
  {
    importMeta: import.meta,
    flags: {
      sample: {
        type: 'string',
        shortFlag: 's',
      },
      tab: {
        type: 'string',
        shortFlag: 't',
        default: 'topology',
      },
      diff: {
        type: 'string',
        shortFlag: 'd',
        isMultiple: true,
      },
      exportHtml: {
        type: 'string',
        shortFlag: 'e',
      },
    },
  }
);

async function main() {
  let scan: NmapRun | undefined;
  let scanLabel = 'Enterprise Multi-Subnet';

  // 1. Check if XML file argument was passed
  const inputFilePath = cli.input[0];
  if (inputFilePath && (inputFilePath === '--help' || inputFilePath === '-h')) {
    cli.showHelp();
    return;
  }
  if (inputFilePath && (inputFilePath === '--version' || inputFilePath === '-v')) {
    cli.showVersion();
    return;
  }

  let diffScanA: NmapRun | undefined;
  let diffScanB: NmapRun | undefined;

  if (cli.flags.diff && Array.isArray(cli.flags.diff) && cli.flags.diff.length >= 2) {
    try {
      const pathA = path.resolve(process.cwd(), cli.flags.diff[0]!);
      const pathB = path.resolve(process.cwd(), cli.flags.diff[1]!);
      diffScanA = parseNmapXml(fs.readFileSync(pathA, 'utf-8'));
      diffScanB = parseNmapXml(fs.readFileSync(pathB, 'utf-8'));
      scan = diffScanB;
      scanLabel = `Diff: ${path.basename(pathA)} ➔ ${path.basename(pathB)}`;
    } catch (err: any) {
      console.error(`Error loading diff files: ${err.message}`);
      process.exit(1);
    }
  } else if (inputFilePath && !inputFilePath.startsWith('-')) {
    try {
      const fullPath = path.resolve(process.cwd(), inputFilePath);
      const xmlContent = fs.readFileSync(fullPath, 'utf-8');
      scan = parseNmapXml(xmlContent);
      scanLabel = path.basename(inputFilePath);
    } catch (err: any) {
      console.error(`Error loading Nmap XML file: ${err.message}`);
      process.exit(1);
    }
  } else if (cli.flags.sample) {
    const sampleKey = cli.flags.sample as keyof typeof SAMPLE_SCANS;
    const sample = SAMPLE_SCANS[sampleKey];
    if (sample && sample.xml) {
      scan = parseNmapXml(sample.xml);
      scanLabel = sample.name;
    }
  }

  // 2. Headless Export HTML if requested
  if (cli.flags.exportHtml) {
    const currentScan = scan || parseNmapXml(SAMPLE_SCANS.enterprise.xml);
    const graph = generateTopology(currentScan);
    const html = generateHtmlReport(currentScan, graph);
    const outPath = path.resolve(process.cwd(), cli.flags.exportHtml);
    fs.writeFileSync(outPath, html, 'utf-8');
    console.log(`✔ NastyMap standalone HTML report exported to: ${outPath}`);
    process.exit(0);
  }

  const initialTab = (cli.flags.tab as TabId) || (cli.flags.diff ? 'diff' : 'topology');

  // 3. Render Ink TUI Application
  render(
    <App
      initialScan={scan}
      initialScanLabel={scanLabel}
      initialTab={initialTab}
      diffScanA={diffScanA}
      diffScanB={diffScanB}
    />
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
