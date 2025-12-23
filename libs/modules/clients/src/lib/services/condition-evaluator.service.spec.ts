import { Test, TestingModule } from '@nestjs/testing';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { Client } from '@accounting/common';
import {
  SingleCondition,
  ConditionGroup,
  AutoAssignCondition,
} from '@accounting/common';
import { EmploymentType, VatStatus, TaxScheme, ZusStatus } from '@accounting/common';

describe('ConditionEvaluatorService', () => {
  let service: ConditionEvaluatorService;
  let mockClient: Partial<Client>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConditionEvaluatorService],
    }).compile();

    service = module.get<ConditionEvaluatorService>(ConditionEvaluatorService);

    // Create a mock client with various field types
    mockClient = {
      id: 'test-client-id',
      name: 'Test Company Ltd',
      nip: '1234567890',
      email: 'test@company.com',
      phone: '+48123456789',
      companySpecificity: 'Software Development',
      additionalInfo: 'Premium client with special requirements',
      gtuCode: 'GTU_01',
      gtuCodes: ['GTU_01', 'GTU_02', 'GTU_03'],
      employmentType: EmploymentType.DG,
      vatStatus: VatStatus.VAT_MONTHLY,
      taxScheme: TaxScheme.GENERAL,
      zusStatus: ZusStatus.FULL,
      receiveEmailCopy: true,
      isActive: true,
      companyId: 'company-123',
      createdById: 'user-123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      company: {
        id: 'company-123',
        name: 'Parent Company Inc',
      } as any,
    };
  });

  describe('Null/Empty Condition Handling', () => {
    it('should return false for null condition', () => {
      const result = service.evaluate(mockClient as Client, null);
      expect(result).toBe(false);
    });

    it('should return false for undefined condition', () => {
      const result = service.evaluate(mockClient as Client, undefined as any);
      expect(result).toBe(false);
    });
  });

  describe('Single Condition - equals operator', () => {
    it('should return true when string field equals value', () => {
      const condition: SingleCondition = {
        field: 'name',
        operator: 'equals',
        value: 'Test Company Ltd',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return true when enum field equals value', () => {
      const condition: SingleCondition = {
        field: 'employmentType',
        operator: 'equals',
        value: EmploymentType.DG,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return true when boolean field equals value', () => {
      const condition: SingleCondition = {
        field: 'receiveEmailCopy',
        operator: 'equals',
        value: true,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when string field does not equal value', () => {
      const condition: SingleCondition = {
        field: 'name',
        operator: 'equals',
        value: 'Different Company',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });

    it('should be case-insensitive for string comparison', () => {
      const condition: SingleCondition = {
        field: 'name',
        operator: 'equals',
        value: 'test company ltd',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });
  });

  describe('Single Condition - notEquals operator', () => {
    it('should return true when field does not equal value', () => {
      const condition: SingleCondition = {
        field: 'name',
        operator: 'notEquals',
        value: 'Different Company',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when field equals value', () => {
      const condition: SingleCondition = {
        field: 'employmentType',
        operator: 'notEquals',
        value: EmploymentType.DG,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });
  });

  describe('Single Condition - contains operator', () => {
    it('should return true when string field contains substring', () => {
      const condition: SingleCondition = {
        field: 'name',
        operator: 'contains',
        value: 'Company',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return true when array field contains value', () => {
      const condition: SingleCondition = {
        field: 'gtuCodes',
        operator: 'contains',
        value: 'GTU_02',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when string field does not contain substring', () => {
      const condition: SingleCondition = {
        field: 'name',
        operator: 'contains',
        value: 'Corporation',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });

    it('should return false when array field does not contain value', () => {
      const condition: SingleCondition = {
        field: 'gtuCodes',
        operator: 'contains',
        value: 'GTU_99',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });

    it('should be case-insensitive for string contains', () => {
      const condition: SingleCondition = {
        field: 'name',
        operator: 'contains',
        value: 'COMPANY',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });
  });

  describe('Single Condition - notContains operator', () => {
    it('should return true when string field does not contain substring', () => {
      const condition: SingleCondition = {
        field: 'name',
        operator: 'notContains',
        value: 'Corporation',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when string field contains substring', () => {
      const condition: SingleCondition = {
        field: 'name',
        operator: 'notContains',
        value: 'Company',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });
  });

  describe('Single Condition - greaterThan operator', () => {
    it('should return true when numeric field is greater than value', () => {
      mockClient.nip = '9999999999'; // NIP as string but converted to number

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'greaterThan',
        value: 5000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when numeric field is not greater than value', () => {
      mockClient.nip = '1000000000';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'greaterThan',
        value: 5000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });
  });

  describe('Single Condition - lessThan operator', () => {
    it('should return true when numeric field is less than value', () => {
      mockClient.nip = '1000000000';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'lessThan',
        value: 5000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when numeric field is not less than value', () => {
      mockClient.nip = '9999999999';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'lessThan',
        value: 5000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });
  });

  describe('Single Condition - greaterThanOrEqual operator', () => {
    it('should return true when field is greater than value', () => {
      mockClient.nip = '9999999999';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'greaterThanOrEqual',
        value: 5000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return true when field equals value', () => {
      mockClient.nip = '5000000000';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'greaterThanOrEqual',
        value: 5000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when field is less than value', () => {
      mockClient.nip = '1000000000';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'greaterThanOrEqual',
        value: 5000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });
  });

  describe('Single Condition - lessThanOrEqual operator', () => {
    it('should return true when field is less than value', () => {
      mockClient.nip = '1000000000';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'lessThanOrEqual',
        value: 5000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return true when field equals value', () => {
      mockClient.nip = '5000000000';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'lessThanOrEqual',
        value: 5000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when field is greater than value', () => {
      mockClient.nip = '9999999999';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'lessThanOrEqual',
        value: 5000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });
  });

  describe('Single Condition - isEmpty operator', () => {
    it('should return true when field is null', () => {
      mockClient.phone = null as any;

      const condition: SingleCondition = {
        field: 'phone',
        operator: 'isEmpty',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return true when field is undefined', () => {
      mockClient.phone = undefined;

      const condition: SingleCondition = {
        field: 'phone',
        operator: 'isEmpty',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return true when string field is empty', () => {
      mockClient.phone = '';

      const condition: SingleCondition = {
        field: 'phone',
        operator: 'isEmpty',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return true when array field is empty', () => {
      mockClient.gtuCodes = [];

      const condition: SingleCondition = {
        field: 'gtuCodes',
        operator: 'isEmpty',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when field has value', () => {
      const condition: SingleCondition = {
        field: 'phone',
        operator: 'isEmpty',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });
  });

  describe('Single Condition - isNotEmpty operator', () => {
    it('should return true when field has value', () => {
      const condition: SingleCondition = {
        field: 'phone',
        operator: 'isNotEmpty',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when field is null', () => {
      mockClient.phone = null as any;

      const condition: SingleCondition = {
        field: 'phone',
        operator: 'isNotEmpty',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });

    it('should return false when field is empty string', () => {
      mockClient.phone = '';

      const condition: SingleCondition = {
        field: 'phone',
        operator: 'isNotEmpty',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });

    it('should return false when array field is empty', () => {
      mockClient.gtuCodes = [];

      const condition: SingleCondition = {
        field: 'gtuCodes',
        operator: 'isNotEmpty',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });
  });

  describe('Single Condition - in operator', () => {
    it('should return true when field value is in array', () => {
      const condition: SingleCondition = {
        field: 'employmentType',
        operator: 'in',
        value: [EmploymentType.DG, EmploymentType.DG_ETAT, EmploymentType.DG_AKCJONARIUSZ],
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when field value is not in array', () => {
      const condition: SingleCondition = {
        field: 'employmentType',
        operator: 'in',
        value: [EmploymentType.DG_ETAT, EmploymentType.DG_AKCJONARIUSZ],
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });

    it('should return false when value is not an array', () => {
      const condition: SingleCondition = {
        field: 'employmentType',
        operator: 'in',
        value: EmploymentType.DG,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });
  });

  describe('Single Condition - notIn operator', () => {
    it('should return true when field value is not in array', () => {
      const condition: SingleCondition = {
        field: 'employmentType',
        operator: 'notIn',
        value: [EmploymentType.DG_ETAT, EmploymentType.DG_AKCJONARIUSZ],
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when field value is in array', () => {
      const condition: SingleCondition = {
        field: 'employmentType',
        operator: 'notIn',
        value: [EmploymentType.DG, EmploymentType.DG_ETAT, EmploymentType.DG_AKCJONARIUSZ],
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });
  });

  describe('Single Condition - between operator', () => {
    it('should return true when field value is within range', () => {
      mockClient.nip = '5000000000';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'between',
        value: 1000000000,
        secondValue: 9000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return true when field value equals lower bound', () => {
      mockClient.nip = '1000000000';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'between',
        value: 1000000000,
        secondValue: 9000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return true when field value equals upper bound', () => {
      mockClient.nip = '9000000000';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'between',
        value: 1000000000,
        secondValue: 9000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when field value is below range', () => {
      mockClient.nip = '500000000';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'between',
        value: 1000000000,
        secondValue: 9000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });

    it('should return false when field value is above range', () => {
      mockClient.nip = '9500000000';

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'between',
        value: 1000000000,
        secondValue: 9000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });
  });

  describe('Dot-Notation Field Access', () => {
    it('should access nested field using dot notation', () => {
      const condition: SingleCondition = {
        field: 'company.name',
        operator: 'equals',
        value: 'Parent Company Inc',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should access deeply nested field', () => {
      mockClient.company = {
        id: 'company-123',
        name: 'Parent Company Inc',
        settings: {
          timezone: 'Europe/Warsaw',
        },
      } as any;

      const condition: SingleCondition = {
        field: 'company.settings.timezone',
        operator: 'equals',
        value: 'Europe/Warsaw',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should return false when nested field does not exist', () => {
      const condition: SingleCondition = {
        field: 'company.nonexistent',
        operator: 'equals',
        value: 'test',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });
  });

  describe('Condition Groups - AND logic', () => {
    it('should return true when all conditions in AND group are true', () => {
      const conditionGroup: ConditionGroup = {
        logicalOperator: 'and',
        conditions: [
          {
            field: 'employmentType',
            operator: 'equals',
            value: EmploymentType.DG,
          },
          {
            field: 'vatStatus',
            operator: 'equals',
            value: VatStatus.VAT_MONTHLY,
          },
          {
            field: 'isActive',
            operator: 'equals',
            value: true,
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, conditionGroup);
      expect(result).toBe(true);
    });

    it('should return false when any condition in AND group is false', () => {
      const conditionGroup: ConditionGroup = {
        logicalOperator: 'and',
        conditions: [
          {
            field: 'employmentType',
            operator: 'equals',
            value: EmploymentType.DG,
          },
          {
            field: 'vatStatus',
            operator: 'equals',
            value: VatStatus.VAT_QUARTERLY, // This is false
          },
          {
            field: 'isActive',
            operator: 'equals',
            value: true,
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, conditionGroup);
      expect(result).toBe(false);
    });

    it('should return false when all conditions in AND group are false', () => {
      const conditionGroup: ConditionGroup = {
        logicalOperator: 'and',
        conditions: [
          {
            field: 'employmentType',
            operator: 'equals',
            value: EmploymentType.DG_ETAT,
          },
          {
            field: 'vatStatus',
            operator: 'equals',
            value: VatStatus.VAT_QUARTERLY,
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, conditionGroup);
      expect(result).toBe(false);
    });
  });

  describe('Condition Groups - OR logic', () => {
    it('should return true when all conditions in OR group are true', () => {
      const conditionGroup: ConditionGroup = {
        logicalOperator: 'or',
        conditions: [
          {
            field: 'employmentType',
            operator: 'equals',
            value: EmploymentType.DG,
          },
          {
            field: 'vatStatus',
            operator: 'equals',
            value: VatStatus.VAT_MONTHLY,
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, conditionGroup);
      expect(result).toBe(true);
    });

    it('should return true when at least one condition in OR group is true', () => {
      const conditionGroup: ConditionGroup = {
        logicalOperator: 'or',
        conditions: [
          {
            field: 'employmentType',
            operator: 'equals',
            value: EmploymentType.DG,
          },
          {
            field: 'vatStatus',
            operator: 'equals',
            value: VatStatus.VAT_QUARTERLY, // This is false
          },
          {
            field: 'taxScheme',
            operator: 'equals',
            value: TaxScheme.LUMP_SUM, // This is also false
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, conditionGroup);
      expect(result).toBe(true);
    });

    it('should return false when all conditions in OR group are false', () => {
      const conditionGroup: ConditionGroup = {
        logicalOperator: 'or',
        conditions: [
          {
            field: 'employmentType',
            operator: 'equals',
            value: EmploymentType.DG_ETAT,
          },
          {
            field: 'vatStatus',
            operator: 'equals',
            value: VatStatus.VAT_QUARTERLY,
          },
          {
            field: 'taxScheme',
            operator: 'equals',
            value: TaxScheme.LUMP_SUM,
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, conditionGroup);
      expect(result).toBe(false);
    });
  });

  describe('Nested Condition Groups', () => {
    it('should evaluate nested AND groups within OR group', () => {
      const conditionGroup: ConditionGroup = {
        logicalOperator: 'or',
        conditions: [
          {
            logicalOperator: 'and',
            conditions: [
              {
                field: 'employmentType',
                operator: 'equals',
                value: EmploymentType.DG,
              },
              {
                field: 'vatStatus',
                operator: 'equals',
                value: VatStatus.VAT_MONTHLY,
              },
            ],
          },
          {
            logicalOperator: 'and',
            conditions: [
              {
                field: 'taxScheme',
                operator: 'equals',
                value: TaxScheme.LUMP_SUM,
              },
              {
                field: 'zusStatus',
                operator: 'equals',
                value: ZusStatus.FULL,
              },
            ],
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, conditionGroup);
      expect(result).toBe(true); // First AND group matches
    });

    it('should evaluate nested OR groups within AND group', () => {
      const conditionGroup: ConditionGroup = {
        logicalOperator: 'and',
        conditions: [
          {
            logicalOperator: 'or',
            conditions: [
              {
                field: 'employmentType',
                operator: 'equals',
                value: EmploymentType.DG,
              },
              {
                field: 'employmentType',
                operator: 'equals',
                value: EmploymentType.DG_ETAT,
              },
            ],
          },
          {
            logicalOperator: 'or',
            conditions: [
              {
                field: 'vatStatus',
                operator: 'equals',
                value: VatStatus.VAT_MONTHLY,
              },
              {
                field: 'vatStatus',
                operator: 'equals',
                value: VatStatus.VAT_QUARTERLY,
              },
            ],
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, conditionGroup);
      expect(result).toBe(true); // Both OR groups match
    });

    it('should handle deeply nested groups (3 levels)', () => {
      const conditionGroup: ConditionGroup = {
        logicalOperator: 'and',
        conditions: [
          {
            field: 'isActive',
            operator: 'equals',
            value: true,
          },
          {
            logicalOperator: 'or',
            conditions: [
              {
                logicalOperator: 'and',
                conditions: [
                  {
                    field: 'employmentType',
                    operator: 'equals',
                    value: EmploymentType.DG,
                  },
                  {
                    field: 'vatStatus',
                    operator: 'equals',
                    value: VatStatus.VAT_MONTHLY,
                  },
                ],
              },
              {
                logicalOperator: 'and',
                conditions: [
                  {
                    field: 'taxScheme',
                    operator: 'equals',
                    value: TaxScheme.PIT_17,
                  },
                  {
                    field: 'zusStatus',
                    operator: 'equals',
                    value: ZusStatus.PREFERENTIAL,
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, conditionGroup);
      expect(result).toBe(true); // isActive is true AND first nested AND group matches
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing fields gracefully', () => {
      const condition: SingleCondition = {
        field: 'nonexistentField',
        operator: 'equals',
        value: 'test',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });

    it('should handle null field values', () => {
      mockClient.phone = null as any;

      const condition: SingleCondition = {
        field: 'phone',
        operator: 'equals',
        value: '+48123456789',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });

    it('should handle undefined field values', () => {
      mockClient.phone = undefined;

      const condition: SingleCondition = {
        field: 'phone',
        operator: 'contains',
        value: '123',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });

    it('should handle empty string comparisons', () => {
      mockClient.phone = '';

      const condition: SingleCondition = {
        field: 'phone',
        operator: 'equals',
        value: '',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should handle type conversion for numeric comparisons', () => {
      mockClient.nip = '1234567890'; // String representation

      const condition: SingleCondition = {
        field: 'nip',
        operator: 'greaterThan',
        value: 1000000000,
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should handle empty arrays', () => {
      mockClient.gtuCodes = [];

      const condition: SingleCondition = {
        field: 'gtuCodes',
        operator: 'contains',
        value: 'GTU_01',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });

    it('should handle conditions with undefined value for isEmpty operator', () => {
      const condition: SingleCondition = {
        field: 'phone',
        operator: 'isEmpty',
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false); // phone has a value
    });
  });

  describe('Complex Real-World Scenarios', () => {
    it('should match premium client with specific tax setup', () => {
      const condition: ConditionGroup = {
        logicalOperator: 'and',
        conditions: [
          {
            field: 'isActive',
            operator: 'equals',
            value: true,
          },
          {
            field: 'receiveEmailCopy',
            operator: 'equals',
            value: true,
          },
          {
            logicalOperator: 'or',
            conditions: [
              {
                logicalOperator: 'and',
                conditions: [
                  {
                    field: 'vatStatus',
                    operator: 'equals',
                    value: VatStatus.VAT_MONTHLY,
                  },
                  {
                    field: 'employmentType',
                    operator: 'in',
                    value: [EmploymentType.DG, EmploymentType.DG_ETAT],
                  },
                ],
              },
              {
                logicalOperator: 'and',
                conditions: [
                  {
                    field: 'taxScheme',
                    operator: 'equals',
                    value: TaxScheme.GENERAL,
                  },
                  {
                    field: 'zusStatus',
                    operator: 'equals',
                    value: ZusStatus.FULL,
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should not match inactive clients regardless of other conditions', () => {
      mockClient.isActive = false;

      const condition: ConditionGroup = {
        logicalOperator: 'and',
        conditions: [
          {
            field: 'isActive',
            operator: 'equals',
            value: true,
          },
          {
            field: 'vatStatus',
            operator: 'equals',
            value: VatStatus.VAT_MONTHLY,
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(false);
    });

    it('should match clients with specific GTU codes', () => {
      const condition: ConditionGroup = {
        logicalOperator: 'and',
        conditions: [
          {
            field: 'gtuCodes',
            operator: 'contains',
            value: 'GTU_01',
          },
          {
            field: 'gtuCodes',
            operator: 'contains',
            value: 'GTU_02',
          },
          {
            field: 'employmentType',
            operator: 'equals',
            value: EmploymentType.DG,
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });

    it('should match software development companies', () => {
      const condition: ConditionGroup = {
        logicalOperator: 'and',
        conditions: [
          {
            field: 'companySpecificity',
            operator: 'contains',
            value: 'Software',
          },
          {
            field: 'isActive',
            operator: 'equals',
            value: true,
          },
        ],
      };

      const result = service.evaluate(mockClient as Client, condition);
      expect(result).toBe(true);
    });
  });
});
