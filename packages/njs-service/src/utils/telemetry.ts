import fs from 'fs';
import path from 'path';

/**
 * Resolve the absolute path to `document/latency_metrics.md`.
 */
export function resolveLatencyMdPath(): string | null {
  if (process.env.LATENCY_MD_PATH) return process.env.LATENCY_MD_PATH;

  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, 'document', 'latency_metrics.md');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

/**
 * Differentiate local requests from deployed/production ones.
 */
export function isLocalIp(ip: string): boolean {
  if (!ip) return true;
  const cleanIp = ip.replace(/^::ffff:/, '').trim();
  return (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp === 'localhost' ||
    cleanIp.startsWith('127.') ||
    cleanIp === 'Unknown'
  );
}

/**
 * Formats a markdown row for latency metrics.
 */
export function formatMdRow(
  now: Date,
  endpointStr: string,
  networkMs: number,
  serverMs: number,
  totalMs: number,
  note: string
): string {
  const dd = now.getDate().toString().padStart(2, '0');
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  const timestampMD = `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  
  return `| ${timestampMD} | ${endpointStr} | ~${networkMs.toFixed(2)} ms | ~${serverMs.toFixed(2)} ms | ~${totalMs.toFixed(2)} ms | ${note} |`;
}

/**
 * Intelligently inserts a new latency metric row into the correct table inside `latency_metrics.md`.
 */
export function appendLatencyRowToMd(
  now: Date,
  endpointStr: string,
  networkMs: number,
  serverMs: number,
  totalMs: number,
  clientIp: string
): void {
  const mdFilePath = resolveLatencyMdPath();
  if (!mdFilePath) {
    console.warn('[Telemetry] Could not resolve latency_metrics.md path');
    return;
  }

  try {
    const fileContent = fs.readFileSync(mdFilePath, 'utf8');
    const lines = fileContent.split(/\r?\n/);

    const isLocal = isLocalIp(clientIp);
    const sectionHeader = isLocal
      ? '## 5. Kết quả đo lường trên môi trường Local'
      : '## 6. Kết quả đo lường trên môi trường Deploy (Render / Docker)';

    const headerIndex = lines.findIndex(line => line.includes(sectionHeader));
    if (headerIndex === -1) {
      console.warn(`[Telemetry] Section header "${sectionHeader}" not found in ${mdFilePath}`);
      // Fallback: append at the end
      const note = isLocal ? `Client IP: ${clientIp}` : `Render (Singapore) — Client IP: ${clientIp}`;
      fs.appendFileSync(mdFilePath, `\n${formatMdRow(now, endpointStr, networkMs, serverMs, totalMs, note)}\n`);
      return;
    }

    // Find where the table starts under this section
    let tableStartIndex = -1;
    for (let i = headerIndex + 1; i < lines.length; i++) {
      if (lines[i].trim().startsWith('|')) {
        tableStartIndex = i;
        break;
      }
    }

    if (tableStartIndex === -1) {
      console.warn(`[Telemetry] Table not found after header "${sectionHeader}"`);
      const note = isLocal ? `Client IP: ${clientIp}` : `Render (Singapore) — Client IP: ${clientIp}`;
      fs.appendFileSync(mdFilePath, `\n${formatMdRow(now, endpointStr, networkMs, serverMs, totalMs, note)}\n`);
      return;
    }

    // Find the end of the table (first line after table start that does NOT start with '|')
    let tableEndIndex = tableStartIndex;
    while (tableEndIndex < lines.length && lines[tableEndIndex].trim().startsWith('|')) {
      tableEndIndex++;
    }

    // Determine insert position
    let insertIndex = tableEndIndex;
    if (!isLocal) {
      // For Section 6, check if the last line of the table is the placeholder row.
      // If so, insert BEFORE the placeholder row.
      const lastLineIndex = tableEndIndex - 1;
      if (lastLineIndex >= tableStartIndex) {
        const lastLine = lines[lastLineIndex];
        if (lastLine.includes('tự động cập nhật sau khi chạy deploy')) {
          insertIndex = lastLineIndex;
        }
      }
    }

    const note = isLocal
      ? `Client IP: ${clientIp}`
      : `Render (Singapore) — Client IP: ${clientIp}`;

    const mdRow = formatMdRow(now, endpointStr, networkMs, serverMs, totalMs, note);
    lines.splice(insertIndex, 0, mdRow);

    fs.writeFileSync(mdFilePath, lines.join('\n'), 'utf8');
  } catch (err) {
    console.error('[Telemetry] Error updating latency_metrics.md:', err);
  }
}
