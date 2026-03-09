import { Test, type TestingModule } from '@nestjs/testing';

import { TimeTrackingExportService } from './time-tracking-export.service';

describe('TimeTrackingExportService', () => {
  let service: TimeTrackingExportService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TimeTrackingExportService,
          useFactory: () => new TimeTrackingExportService(),
        },
      ],
    }).compile();

    service = module.get<TimeTrackingExportService>(TimeTrackingExportService);
  });

  it('should generate CSV with Polish headers and summary data', () => {
    const reportData = {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      totalMinutes: 2400,
      billableMinutes: 1800,
      nonBillableMinutes: 600,
      totalAmount: 5000,
      entriesCount: 40,
    };

    const csv = service.generateCsv(reportData);
    const lines = csv.split('\n');

    expect(lines[0]).toContain('Raport czasu pracy');
    expect(lines[1]).toContain('2024-01-01');
    expect(lines[1]).toContain('2024-01-31');
    // Summary section
    expect(lines[3]).toContain('Podsumowanie');
    expect(lines[4]).toContain('2400');
    expect(lines[5]).toContain('1800');
    expect(lines[6]).toContain('600');
    expect(lines[7]).toContain('5000');
    expect(lines[8]).toContain('40');
  });

  it('should include grouped data rows when present', () => {
    const reportData = {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      totalMinutes: 180,
      billableMinutes: 120,
      nonBillableMinutes: 60,
      totalAmount: 1000,
      entriesCount: 5,
      groupedData: [
        {
          groupName: 'Acme Corp',
          totalMinutes: 120,
          billableMinutes: 90,
          totalAmount: 700,
          entriesCount: 3,
        },
        {
          groupName: 'Beta Ltd',
          totalMinutes: 60,
          billableMinutes: 30,
          totalAmount: 300,
          entriesCount: 2,
        },
      ],
    };

    const csv = service.generateCsv(reportData);
    const lines = csv.split('\n');

    // Find grouped data header
    const headerIdx = lines.findIndex((l) => l.includes('Grupa,Całkowity czas (min)'));
    expect(headerIdx).toBeGreaterThan(-1);

    // Data rows follow the header
    expect(lines[headerIdx + 1]).toContain('Acme Corp');
    expect(lines[headerIdx + 1]).toContain('120');
    expect(lines[headerIdx + 2]).toContain('Beta Ltd');
    expect(lines[headerIdx + 2]).toContain('60');
  });

  it('should not include grouped data section when groupedData is empty', () => {
    const reportData = {
      startDate: '2024-02-01',
      endDate: '2024-02-28',
      totalMinutes: 60,
      billableMinutes: 60,
      nonBillableMinutes: 0,
      totalAmount: 100,
      entriesCount: 1,
      groupedData: [],
    };

    const csv = service.generateCsv(reportData);

    expect(csv).not.toContain('Dane szczegółowe');
    expect(csv).not.toContain('Grupa,Całkowity czas (min)');
  });
});
