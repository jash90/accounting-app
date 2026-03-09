import { Test, type TestingModule } from '@nestjs/testing';

import { TimeTrackingPdfService } from './time-tracking-pdf.service';
import type { ReportSummary } from './timesheet.service';

// Mock ensurePdfmakeFonts before import
const mockGetBuffer = jest.fn();
const mockCreatePdf = jest.fn().mockReturnValue({ getBuffer: mockGetBuffer });

jest.mock('@accounting/common', () => ({
  ensurePdfmakeFonts: jest.fn(() => ({
    createPdf: mockCreatePdf,
  })),
}));

describe('TimeTrackingPdfService', () => {
  let service: TimeTrackingPdfService;

  const baseSummary: ReportSummary = {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    totalMinutes: 2400,
    billableMinutes: 1800,
    nonBillableMinutes: 600,
    totalAmount: 5000,
    entriesCount: 40,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetBuffer.mockResolvedValue(Buffer.from('pdf-content'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TimeTrackingPdfService,
          useFactory: () => new TimeTrackingPdfService(),
        },
      ],
    }).compile();

    service = module.get<TimeTrackingPdfService>(TimeTrackingPdfService);
  });

  it('should generate a PDF buffer', async () => {
    const result = await service.generateTimeReportPdf(baseSummary);

    expect(result).toBeInstanceOf(Buffer);
    expect(mockCreatePdf).toHaveBeenCalledTimes(1);
    expect(mockGetBuffer).toHaveBeenCalledTimes(1);
  });

  it('should include Polish header and date range', async () => {
    await service.generateTimeReportPdf(baseSummary);

    const docDefinition = mockCreatePdf.mock.calls[0][0];
    const content = docDefinition.content as any[];

    // Header: "Raport czasu pracy"
    expect(content[0].text).toBe('Raport czasu pracy');
    // Date range with en-dash
    expect(content[1].text).toContain('2024-01-01');
    expect(content[1].text).toContain('2024-01-31');
  });

  it('should format time entries in summary table correctly', async () => {
    await service.generateTimeReportPdf(baseSummary);

    const docDefinition = mockCreatePdf.mock.calls[0][0];
    const content = docDefinition.content as any[];

    // Summary table is content[3]
    const summaryTable = content[3].table;
    expect(summaryTable).toBeDefined();

    const body = summaryTable.body;
    // Header row + 5 data rows
    expect(body).toHaveLength(6);
    // Total time: 2400 min = 40h 0m
    expect(body[1][1]).toBe('40h 0m');
    // Billable: 1800 min = 30h 0m
    expect(body[2][1]).toBe('30h 0m');
    // Non-billable: 600 min = 10h 0m
    expect(body[3][1]).toBe('10h 0m');
    // Amount in PLN
    expect(body[4][1]).toBe('5000.00 PLN');
    // Entries count
    expect(body[5][1]).toBe('40');
  });

  it('should include grouped data table when groupedData is present', async () => {
    const summaryWithGroups: ReportSummary = {
      ...baseSummary,
      groupedData: [
        {
          groupId: 'client-1',
          groupName: 'Acme Corp',
          totalMinutes: 1200,
          billableMinutes: 900,
          totalAmount: 2500,
          entriesCount: 20,
        },
        {
          groupId: 'client-2',
          groupName: 'Beta Ltd',
          totalMinutes: 1200,
          billableMinutes: 900,
          totalAmount: 2500,
          entriesCount: 20,
        },
      ],
    };

    await service.generateTimeReportPdf(summaryWithGroups);

    const docDefinition = mockCreatePdf.mock.calls[0][0];
    const content = docDefinition.content as any[];

    // Should have grouped data section title and table
    const sectionTitles = content.filter(
      (c: any) => c.text === 'Dane szczegółowe'
    );
    expect(sectionTitles).toHaveLength(1);

    // Find the grouped data table (the one with 5 columns)
    const groupedTable = content.find(
      (c: any) => c.table && c.table.widths && c.table.widths.length === 5
    );
    expect(groupedTable).toBeDefined();
    // Header + 2 data rows
    expect(groupedTable.table.body).toHaveLength(3);
    expect(groupedTable.table.body[1][0]).toBe('Acme Corp');
  });

  it('should NOT include grouped data table when groupedData is empty', async () => {
    const summaryNoGroups: ReportSummary = {
      ...baseSummary,
      groupedData: [],
    };

    await service.generateTimeReportPdf(summaryNoGroups);

    const docDefinition = mockCreatePdf.mock.calls[0][0];
    const content = docDefinition.content as any[];

    const sectionTitles = content.filter(
      (c: any) => c.text === 'Dane szczegółowe'
    );
    expect(sectionTitles).toHaveLength(0);
  });

  it('should include a generated-at footer in Polish locale', async () => {
    await service.generateTimeReportPdf(baseSummary);

    const docDefinition = mockCreatePdf.mock.calls[0][0];
    const content = docDefinition.content as any[];

    const footer = content[content.length - 1];
    expect(footer.text).toContain('Wygenerowano:');
    expect(footer.style).toBe('footer');
  });
});
