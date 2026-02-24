import { Injectable } from '@nestjs/common';

@Injectable()
export class TimeTrackingExportService {
  /**
   * Sanitize a CSV field value to prevent CSV injection attacks.
   * Values starting with =, +, -, @, Tab, or CR are prefixed with a single quote.
   * Values containing quotes, commas, or newlines are properly quoted and escaped.
   */
  escapeCsvField(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) {
      return `'${str}`;
    }
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateCsv(reportData: any): string {
    const escape = (v: string | number | null | undefined) => this.escapeCsvField(v);
    const lines: string[] = [];

    lines.push(escape('Raport czasu pracy'));
    lines.push(`Okres: ${escape(reportData.startDate)} - ${escape(reportData.endDate)}`);
    lines.push('');

    lines.push(escape('Podsumowanie'));
    lines.push(`Całkowity czas (min),${escape(reportData.totalMinutes)}`);
    lines.push(`Czas rozliczalny (min),${escape(reportData.billableMinutes)}`);
    lines.push(`Czas nierozliczalny (min),${escape(reportData.nonBillableMinutes)}`);
    lines.push(`Całkowita kwota,${escape(reportData.totalAmount)}`);
    lines.push(`Liczba wpisów,${escape(reportData.entriesCount)}`);
    lines.push('');

    if (reportData.groupedData && reportData.groupedData.length > 0) {
      lines.push(escape('Dane szczegółowe'));
      lines.push('Grupa,Całkowity czas (min),Czas rozliczalny (min),Kwota,Liczba wpisów');

      for (const group of reportData.groupedData) {
        lines.push(
          `${escape(group.groupName)},${escape(group.totalMinutes)},${escape(group.billableMinutes)},${escape(group.totalAmount)},${escape(group.entriesCount)}`
        );
      }
    }

    return lines.join('\n');
  }
}
