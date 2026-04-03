import { SystemCompanyService } from '@accounting/common/backend';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { generateCsvBuffer, MonthlySettlement, User } from '@accounting/common';

import { GetSettlementsQueryDto } from '../dto/get-settlements-query.dto';

@Injectable()
export class SettlementExportService {
  constructor(
    @InjectRepository(MonthlySettlement)
    private readonly settlementRepository: Repository<MonthlySettlement>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async exportToCsv(filters: GetSettlementsQueryDto, user: User): Promise<Buffer> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const queryBuilder = this.settlementRepository
      .createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.client', 'client')
      .leftJoinAndSelect('settlement.assignedUser', 'assignedUser')
      .where('settlement.companyId = :companyId', { companyId });

    if (filters?.month) {
      queryBuilder.andWhere('settlement.month = :month', { month: filters.month });
    }

    if (filters?.year) {
      queryBuilder.andWhere('settlement.year = :year', { year: filters.year });
    }

    if (filters?.status) {
      queryBuilder.andWhere('settlement.status = :status', { status: filters.status });
    }

    if (filters?.assigneeId) {
      queryBuilder.andWhere('settlement.userId = :assigneeId', { assigneeId: filters.assigneeId });
    }

    queryBuilder
      .orderBy('client.name', 'ASC')
      .addOrderBy('settlement.year', 'DESC')
      .addOrderBy('settlement.month', 'DESC');

    const settlements = await queryBuilder.getMany();
    return this.generateCsv(settlements);
  }

  private generateCsv(settlements: MonthlySettlement[]): Buffer {
    const headers = [
      'Klient',
      'NIP',
      'Miesiąc',
      'Rok',
      'Status',
      'Przypisany do',
      'Priorytet',
      'Termin',
      'Dokumenty kompletne',
      'Notatki',
    ];

    const rows = settlements.map((s) => [
      s.client?.name || '',
      s.client?.nip || '',
      String(s.month),
      String(s.year),
      s.status,
      s.assignedUser ? `${s.assignedUser.firstName} ${s.assignedUser.lastName}` : '',
      String(s.priority),
      s.deadline ? new Date(s.deadline).toISOString().split('T')[0] : '',
      s.documentsComplete ? 'Tak' : 'Nie',
      s.notes || '',
    ]);

    return generateCsvBuffer(headers, rows);
  }
}
