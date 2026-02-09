import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import { Offer } from '@accounting/common';

@Injectable()
export class OfferNumberingService {
  constructor(
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Generates a unique offer number in the format: OF/YYYY/NNN
   * where YYYY is the current year and NNN is a sequential number.
   *
   * Uses pessimistic locking (SELECT FOR UPDATE) within a SERIALIZABLE
   * transaction to prevent race conditions under concurrent load.
   *
   * @param entityManager - Optional EntityManager from an outer transaction.
   *   When provided, the locking query runs inside the caller's transaction
   *   instead of creating a new one.
   */
  async generateOfferNumber(
    companyId: string,
    entityManager?: import('typeorm').EntityManager
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OF/${year}/`;

    const generate = async (manager: import('typeorm').EntityManager): Promise<string> => {
      // Use numeric extraction + casting for correct ordering beyond 999
      const lastOffer = await manager
        .createQueryBuilder(Offer, 'offer')
        .where('offer.companyId = :companyId', { companyId })
        .andWhere('offer.offerNumber LIKE :prefix', { prefix: `${prefix}%` })
        .orderBy('CAST(SUBSTRING(offer.offerNumber FROM :substringPos) AS INTEGER)', 'DESC')
        .setParameter('substringPos', prefix.length + 1)
        .setLock('pessimistic_write')
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
    };

    // If an outer EntityManager is provided, reuse its transaction
    if (entityManager) {
      return generate(entityManager);
    }

    // Otherwise, create a SERIALIZABLE transaction
    return this.dataSource.transaction('SERIALIZABLE', generate);
  }
}
