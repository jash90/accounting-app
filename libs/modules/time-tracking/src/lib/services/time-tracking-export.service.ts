import { Injectable } from '@nestjs/common';

import { escapeCsvField } from '@accounting/common';

@Injectable()
export class TimeTrackingExportService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateCsv(reportData: any): string {
    const escape = (v: string | number | null | undefined) => escapeCsvField(v);
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
