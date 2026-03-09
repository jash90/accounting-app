/**
 * Escapes a CSV field value for safe export.
 * - Prevents CSV injection (formula injection) by prefixing values starting with formula chars
 * - Handles special characters (commas, quotes, newlines) by quoting
 *
 * @param field - The value to escape. null/undefined returns empty string.
 */
export function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a CSV string from an array of headers and rows.
 * Each field is escaped using escapeCsvField.
 */
export function generateCsvContent(headers: string[], rows: string[][]): string {
  return [headers.join(','), ...rows.map((row) => row.map(escapeCsvField).join(','))].join('\n');
}

/**
 * Generates a UTF-8 Buffer from headers and rows.
 * Convenience wrapper around generateCsvContent for HTTP responses.
 */
export function generateCsvBuffer(headers: string[], rows: string[][]): Buffer {
  return Buffer.from(generateCsvContent(headers, rows), 'utf-8');
}

/**
 * Parses a single CSV line into an array of field values.
 * Handles RFC 4180 quoting: quoted fields may contain commas and escaped double-quotes ("").
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}
