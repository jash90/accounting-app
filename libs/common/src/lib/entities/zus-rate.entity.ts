import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Rate types for ZUS contributions
 * Typy stawek ZUS
 */
export enum ZusRateType {
  /** 60% prognozowanego przeciętnego wynagrodzenia - pełny ZUS */
  FULL_BASIS = 'FULL_BASIS',
  /** 30% minimalnego wynagrodzenia - mały ZUS */
  SMALL_ZUS_BASIS = 'SMALL_ZUS_BASIS',
  /** Minimalne wynagrodzenie */
  MINIMUM_WAGE = 'MINIMUM_WAGE',
  /** Prognozowane przeciętne wynagrodzenie */
  AVERAGE_WAGE = 'AVERAGE_WAGE',
  /** Minimalna składka zdrowotna */
  HEALTH_MIN = 'HEALTH_MIN',
  /** Ryczałt - próg do 60 tys. */
  LUMP_SUM_TIER_1 = 'LUMP_SUM_TIER_1',
  /** Ryczałt - próg 60-300 tys. */
  LUMP_SUM_TIER_2 = 'LUMP_SUM_TIER_2',
  /** Ryczałt - próg powyżej 300 tys. */
  LUMP_SUM_TIER_3 = 'LUMP_SUM_TIER_3',
}

/**
 * ZUS Rate - historical and current ZUS contribution rates and bases
 * Stawki i podstawy składek ZUS (historyczne i aktualne)
 */
@Entity('zus_rates')
@Index(['rateType'])
@Index(['validFrom', 'validTo'])
@Index(['rateType', 'validFrom'])
export class ZusRate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Type of rate/basis */
  @Column({ type: 'enum', enum: ZusRateType })
  rateType!: ZusRateType;

  /** Value in grosze (1/100 PLN) for amounts, or basis points for rates */
  @Column({ type: 'int' })
  value!: number;

  /** Start date of validity */
  @Column({ type: 'date' })
  validFrom!: Date;

  /** End date of validity (null = currently valid) */
  @Column({ type: 'date', nullable: true })
  validTo?: Date;

  /** Description of the rate */
  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;
}

/**
 * Default ZUS rates for 2025
 * Domyślne stawki ZUS na 2025 rok
 */
export const DEFAULT_ZUS_RATES_2025: Array<{
  rateType: ZusRateType;
  value: number;
  validFrom: string;
  description: string;
}> = [
  {
    rateType: ZusRateType.FULL_BASIS,
    value: 520380, // 5203.80 PLN in grosze
    validFrom: '2025-01-01',
    description: '60% prognozowanego przeciętnego wynagrodzenia 2025',
  },
  {
    rateType: ZusRateType.SMALL_ZUS_BASIS,
    value: 139950, // 1399.50 PLN in grosze (30% of 4665 PLN min wage)
    validFrom: '2025-01-01',
    description: '30% minimalnego wynagrodzenia 2025',
  },
  {
    rateType: ZusRateType.MINIMUM_WAGE,
    value: 466500, // 4665.00 PLN in grosze
    validFrom: '2025-01-01',
    description: 'Minimalne wynagrodzenie 2025',
  },
  {
    rateType: ZusRateType.AVERAGE_WAGE,
    value: 867300, // 8673.00 PLN in grosze
    validFrom: '2025-01-01',
    description: 'Prognozowane przeciętne wynagrodzenie 2025',
  },
  {
    rateType: ZusRateType.HEALTH_MIN,
    value: 31496, // 314.96 PLN in grosze
    validFrom: '2025-02-01',
    description: 'Minimalna składka zdrowotna (od 02.2025)',
  },
  {
    rateType: ZusRateType.LUMP_SUM_TIER_1,
    value: 46166, // 461.66 PLN in grosze
    validFrom: '2025-02-01',
    description: 'Ryczałt - przychód do 60 000 PLN rocznie',
  },
  {
    rateType: ZusRateType.LUMP_SUM_TIER_2,
    value: 76943, // 769.43 PLN in grosze
    validFrom: '2025-02-01',
    description: 'Ryczałt - przychód 60 001 - 300 000 PLN rocznie',
  },
  {
    rateType: ZusRateType.LUMP_SUM_TIER_3,
    value: 138497, // 1384.97 PLN in grosze
    validFrom: '2025-02-01',
    description: 'Ryczałt - przychód powyżej 300 000 PLN rocznie',
  },
];
