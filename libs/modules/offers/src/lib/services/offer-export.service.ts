import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { generateCsvBuffer, Lead, Offer, User } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { LeadFiltersDto } from '../dto/lead.dto';
import { OfferFiltersDto } from '../dto/offer.dto';

@Injectable()
export class OfferExportService {
  constructor(
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    private readonly tenantService: TenantService
  ) {}

  async exportOffersToCsv(filters: OfferFiltersDto, user: User): Promise<Buffer> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const queryBuilder = this.offerRepository
      .createQueryBuilder('offer')
      .leftJoinAndSelect('offer.client', 'client')
      .where('offer.companyId = :companyId', { companyId });

    if (filters?.status) {
      queryBuilder.andWhere('offer.status = :status', { status: filters.status });
    }

    if (filters?.clientId) {
      queryBuilder.andWhere('offer.clientId = :clientId', { clientId: filters.clientId });
    }

    queryBuilder.orderBy('offer.createdAt', 'DESC');

    const offers = await queryBuilder.getMany();
    return this.generateOffersCsv(offers);
  }

  async exportLeadsToCsv(filters: LeadFiltersDto, user: User): Promise<Buffer> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const queryBuilder = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
      .where('lead.companyId = :companyId', { companyId });

    if (filters?.status) {
      queryBuilder.andWhere('lead.status = :status', { status: filters.status });
    }

    if (filters?.source) {
      queryBuilder.andWhere('lead.source = :source', { source: filters.source });
    }

    if (filters?.assignedToId) {
      queryBuilder.andWhere('lead.assignedToId = :assignedToId', {
        assignedToId: filters.assignedToId,
      });
    }

    queryBuilder.orderBy('lead.createdAt', 'DESC');

    const leads = await queryBuilder.getMany();
    return this.generateLeadsCsv(leads);
  }

  private generateOffersCsv(offers: Offer[]): Buffer {
    const headers = [
      'Numer',
      'Tytuł',
      'Klient',
      'Status',
      'Wartość netto',
      'Wartość brutto',
      'Ważna do',
      'Data oferty',
      'Data utworzenia',
    ];

    const rows = offers.map((offer) => [
      offer.offerNumber,
      offer.title,
      offer.recipientSnapshot?.name || offer.client?.name || '',
      offer.status,
      String(offer.totalNetAmount),
      String(offer.totalGrossAmount),
      offer.validUntil ? new Date(offer.validUntil).toISOString().split('T')[0] : '',
      offer.offerDate ? new Date(offer.offerDate).toISOString().split('T')[0] : '',
      new Date(offer.createdAt).toISOString().split('T')[0],
    ]);

    return generateCsvBuffer(headers, rows);
  }

  private generateLeadsCsv(leads: Lead[]): Buffer {
    const headers = [
      'Firma',
      'Osoba kontaktowa',
      'Email',
      'Telefon',
      'Status',
      'Źródło',
      'Przypisany do',
      'Szacowana wartość',
      'Data utworzenia',
    ];

    const rows = leads.map((lead) => [
      lead.name,
      lead.contactPerson || '',
      lead.email || '',
      lead.phone || '',
      lead.status,
      lead.source || '',
      lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : '',
      lead.estimatedValue ? String(lead.estimatedValue) : '',
      new Date(lead.createdAt).toISOString().split('T')[0],
    ]);

    return generateCsvBuffer(headers, rows);
  }
}
