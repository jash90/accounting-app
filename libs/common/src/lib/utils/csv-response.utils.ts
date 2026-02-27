import type { Response } from 'express';

export function sendCsvResponse(res: Response, buffer: Buffer, filenamePrefix: string): void {
  const filename = `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.csv`;
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.send(buffer);
}
