export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
): string {
  const escape = (value: string | number | boolean | null | undefined) => {
    const raw = value == null ? '' : String(value);
    if (/[",\n\r]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function parseCsv(csv: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const text = csv.replace(/^\uFEFF/, '').trim();
  const lines = splitCsvLines(text);
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }
  const headers = splitCsvRow(lines[0]).map((h) =>
    h.replace(/^\uFEFF/, '').trim(),
  );
  const rows = lines.slice(1).map((line) => {
    const cols = splitCsvRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] ?? '').trim();
    });
    return obj;
  });
  return { headers, rows };
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      if (current.trim().length > 0) lines.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) lines.push(current);
  return lines;
}

function splitCsvRow(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cols.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cols.push(current);
  return cols;
}
