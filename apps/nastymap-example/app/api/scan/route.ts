import { NextRequest } from 'next/server';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let rawCommand: string = body.command?.trim() || '';
    const target: string = body.target?.trim() || '';
    const sudoPassword: string | undefined = body.sudoPassword?.trim();
    let useSudo: boolean = body.useSudo === true;

    // Check if user explicitly typed 'sudo'
    if (rawCommand.startsWith('sudo ')) {
      useSudo = true;
      rawCommand = rawCommand.slice(5).trim();
    }

    let commandArgs: string[] = [];

    if (rawCommand) {
      // Split command string into arguments while respecting quotes
      const matches = rawCommand.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
      const filtered = matches.map((arg) => arg.replace(/^['"]|['"]$/g, ''));
      if (filtered[0]?.toLowerCase() === 'nmap') {
        commandArgs = filtered.slice(1);
      } else {
        commandArgs = filtered;
      }
    } else if (target) {
      commandArgs = ['-sV', '-F', target];
    } else {
      commandArgs = ['-F', '127.0.0.1'];
    }

    // Check if command has flags requiring root privileges
    const requiresRootFlags = ['-O', '-sS', '-sU', '-sN', '-sF', '-sX', '-sA', '-sW', '-sM', '--traceroute'];
    const commandHasRootFlag = commandArgs.some((arg) =>
      requiresRootFlags.includes(arg) || arg === '-A'
    );

    if (commandHasRootFlag && body.useSudo !== false) {
      useSudo = true;
    }

    // If unprivileged mode was explicitly chosen, sanitize flags that would crash Nmap
    if (!useSudo) {
      commandArgs = commandArgs
        .map((arg) => (arg === '-sS' ? '-sT' : arg))
        .filter((arg) => arg !== '-O' && arg !== '--traceroute');
    }

    // Prepare temporary XML output file path
    const tempFileId = crypto.randomUUID();
    const tempXmlPath = path.join(os.tmpdir(), `nastymap_scan_${tempFileId}.xml`);

    // Remove any user-supplied -oX, -oN, -oG, -oA flags to avoid conflicts
    const sanitizedArgs: string[] = [];
    let hasTiming = false;
    let hasVersionIntensity = false;

    for (let i = 0; i < commandArgs.length; i++) {
      const arg = commandArgs[i];
      if (arg === '-oX' || arg === '-oN' || arg === '-oG' || arg === '-oA') {
        i++; // skip flag value
        continue;
      }
      if (arg.startsWith('-oX') || arg.startsWith('-oN') || arg.startsWith('-oG') || arg.startsWith('-oA')) {
        continue;
      }
      if (arg.startsWith('-T') && arg.length === 3) {
        hasTiming = true;
      }
      if (arg.includes('version-intensity') || arg === '--version-light' || arg === '--version-all') {
        hasVersionIntensity = true;
      }
      sanitizedArgs.push(arg);
    }

    // Add timing optimization -T4 if user didn't specify a timing flag
    if (!hasTiming) {
      sanitizedArgs.push('-T4');
    }

    // If -sV is present but no version intensity flag, add --version-light for speed
    if (sanitizedArgs.includes('-sV') && !hasVersionIntensity) {
      sanitizedArgs.push('--version-light');
    }

    // Always add -oX <tempXmlPath> and verbose mode (-v) for live progress streaming
    sanitizedArgs.push('-oX', tempXmlPath);
    if (!sanitizedArgs.includes('-v') && !sanitizedArgs.includes('-vv')) {
      sanitizedArgs.push('-v');
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (event: { type: string; data?: any; line?: string; error?: string; exitCode?: number; xml?: string }) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
          } catch (e) {
            // Stream might be closed by client
          }
        };

        const displayCmd = `${useSudo ? 'sudo ' : ''}nmap ${sanitizedArgs.filter((a) => a !== tempXmlPath && a !== '-oX').join(' ')}`;
        sendEvent({
          type: 'start',
          data: {
            command: displayCmd,
            useSudo,
            timestamp: new Date().toISOString(),
          },
        });

        // Determine executable and spawn parameters
        let executable = 'nmap';
        let spawnArgs = sanitizedArgs;

        if (useSudo) {
          executable = 'sudo';
          if (sudoPassword) {
            // Pass password via stdin (-S) non-interactively without prompt (-p '')
            spawnArgs = ['-S', '-p', '', 'nmap', ...sanitizedArgs];
          } else {
            // Non-interactive passwordless sudo attempt (-n)
            spawnArgs = ['-n', 'nmap', ...sanitizedArgs];
          }
        }

        const nmapProcess = spawn(executable, spawnArgs, {
          shell: false,
        });

        // If sudo password was provided, write it to stdin immediately
        if (useSudo && sudoPassword && nmapProcess.stdin) {
          try {
            nmapProcess.stdin.write(sudoPassword + '\n');
            nmapProcess.stdin.end();
          } catch (e) {}
        }

        let aborted = false;
        let sudoAuthFailed = false;

        // Handle client abort
        req.signal.addEventListener('abort', () => {
          aborted = true;
          try {
            nmapProcess.kill('SIGTERM');
          } catch (e) {}
          fs.unlink(tempXmlPath).catch(() => {});
        });

        // Process timeout protection (3 minutes max)
        const timeoutTimer = setTimeout(async () => {
          if (!aborted) {
            try {
              nmapProcess.kill('SIGKILL');
            } catch (e) {}

            let partialXml = '';
            try {
              partialXml = await fs.readFile(tempXmlPath, 'utf-8');
              await fs.unlink(tempXmlPath).catch(() => {});
            } catch (e) {}

            sendEvent({
              type: 'error',
              error: 'Scan timed out after 180 seconds.',
              xml: partialXml || undefined,
            });
            controller.close();
          }
        }, 180000);

        nmapProcess.stdout.on('data', (chunk: Buffer) => {
          const lines = chunk.toString('utf-8').split(/\r?\n/);
          for (const line of lines) {
            if (line.trim()) {
              sendEvent({ type: 'stdout', line });
            }
          }
        });

        nmapProcess.stderr.on('data', (chunk: Buffer) => {
          const lines = chunk.toString('utf-8').split(/\r?\n/);
          for (const line of lines) {
            if (!line.trim()) continue;
            
            // Check for sudo password / root privilege errors
            if (line.includes('a password is required') || line.includes('incorrect password') || line.includes('sudo:')) {
              sudoAuthFailed = true;
              sendEvent({
                type: 'error',
                error: 'SUDO_PASSWORD_REQUIRED',
                line: `[SUDO] Sudo password required for root privileges.`,
              });
            } else if (line.includes('requires root privileges')) {
              sendEvent({
                type: 'error',
                error: 'ROOT_PRIVILEGES_REQUIRED',
                line: `[PRIVILEGE] ${line}`,
              });
            } else {
              sendEvent({ type: 'stderr', line });
            }
          }
        });

        nmapProcess.on('error', (err) => {
          clearTimeout(timeoutTimer);
          sendEvent({
            type: 'error',
            error: `Failed to execute: ${err.message}.`,
          });
          controller.close();
          fs.unlink(tempXmlPath).catch(() => {});
        });

        nmapProcess.on('close', async (code) => {
          clearTimeout(timeoutTimer);
          if (aborted) {
            try {
              controller.close();
            } catch (e) {}
            return;
          }

          let xmlContent = '';
          try {
            xmlContent = await fs.readFile(tempXmlPath, 'utf-8');
            await fs.unlink(tempXmlPath).catch(() => {});
          } catch (e) {}

          sendEvent({
            type: 'done',
            exitCode: code ?? 0,
            xml: xmlContent,
          });

          try {
            controller.close();
          } catch (e) {}
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
