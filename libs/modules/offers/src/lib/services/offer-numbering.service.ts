import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Offer } from '@accounting/common';

@Injectable()
export class OfferNumberingService {
  constructor(
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>
  ) {}

  /**
   * Generates a unique offer number in the format: OF/YYYY/NNN
   * where YYYY is the current year and NNN is a sequential number.
   */
  async generateOfferNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OF/${year}/`;

    // Get the highest number for this company and year
    const lastOffer = await this.offerRepository
      .createQueryBuilder('offer')
      .where('offer.companyId = :companyId', { companyId })
      .andWhere('offer.offerNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('offer.offerNumber', 'DESC')
      .getOne();

    let nextNumber = 1;

    if (lastOffer) {
      const lastNumberStr = lastOffer.offerNumber.replace(prefix, '');
      const lastNumber = parseInt(lastNumberStr, 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Format with leading zeros (e.g., 001, 012, 123)
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    return `${prefix}${formattedNumber}`;
  }

  /**
   * Validates that an offer number is unique for the company.
   */
  async isOfferNumberUnique(
    offerNumber: string,
    companyId: string,
    excludeOfferId?: string
  ): Promise<boolean> {
    const query = this.offerRepository
      .createQueryBuilder('offer')
      .where('offer.offerNumber = :offerNumber', { offerNumber })
      .andWhere('offer.companyId = :companyId', { companyId });

    if (excludeOfferId) {
      query.andWhere('offer.id != :excludeOfferId', { excludeOfferId });
    }

    const count = await query.getCount();
    return count === 0;
  }
}
