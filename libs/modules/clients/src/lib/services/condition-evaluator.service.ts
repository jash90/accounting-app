import { Injectable } from '@nestjs/common';
import {
  AutoAssignCondition,
  SingleCondition,
  ConditionGroup,
  ConditionOperator,
  isConditionGroup,
} from '@accounting/common';
import { Client } from '@accounting/common';

/**
 * Service for evaluating auto-assign conditions against client data
 */
@Injectable()
export class ConditionEvaluatorService {
  /**
   * Evaluates if a client matches the given auto-assign condition
   * @param client The client to evaluate
   * @param condition The condition to evaluate against
   * @returns true if the client matches the condition
   */
  evaluate(client: Client, condition: AutoAssignCondition | null): boolean {
    if (!condition) {
      return false;
    }

    return isConditionGroup(condition)
      ? this.evaluateGroup(client, condition)
      : this.evaluateSingle(client, condition);
  }

  /**
   * Evaluates a condition group (AND/OR)
   */
  private evaluateGroup(client: Client, group: ConditionGroup): boolean {
    const results = group.conditions.map((cond) =>
      isConditionGroup(cond)
        ? this.evaluateGroup(client, cond)
        : this.evaluateSingle(client, cond)
    );

    return group.logicalOperator === 'and'
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  /**
   * Evaluates a single condition
   */
  private evaluateSingle(client: Client, condition: SingleCondition): boolean {
    const fieldValue = this.getFieldValue(client, condition.field);
    return this.evaluateOperator(
      fieldValue,
      condition.operator,
      condition.value,
      condition.secondValue
    );
  }

  /**
   * Gets a field value from the client, supporting nested fields with dot notation
   */
  private getFieldValue(client: Client, field: string): unknown {
    // Support nested fields with dot notation (e.g., 'company.name')
    const parts = field.split('.');
    let value: unknown = client;

    for (const part of parts) {
      if (value == null) {
        return undefined;
      }
      value = (value as Record<string, unknown>)[part];
    }

    return value;
  }

  /**
   * Evaluates a condition operator
   */
  private evaluateOperator(
    fieldValue: unknown,
    operator: ConditionOperator,
    conditionValue?: unknown,
    secondValue?: unknown
  ): boolean {
    switch (operator) {
      case 'equals':
        return this.normalizeValue(fieldValue) === this.normalizeValue(conditionValue);

      case 'notEquals':
        return this.normalizeValue(fieldValue) !== this.normalizeValue(conditionValue);

      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.some(
            (v) => this.normalizeValue(v) === this.normalizeValue(conditionValue)
          );
        }
        return String(fieldValue ?? '')
          .toLowerCase()
          .includes(String(conditionValue ?? '').toLowerCase());

      case 'notContains':
        if (Array.isArray(fieldValue)) {
          return !fieldValue.some(
            (v) => this.normalizeValue(v) === this.normalizeValue(conditionValue)
          );
        }
        return !String(fieldValue ?? '')
          .toLowerCase()
          .includes(String(conditionValue ?? '').toLowerCase());

      case 'greaterThan': {
        const numField = Number(fieldValue);
        const numCondition = Number(conditionValue);
        if (isNaN(numField) || isNaN(numCondition)) {
          return false;
        }
        return numField > numCondition;
      }

      case 'lessThan': {
        const numField = Number(fieldValue);
        const numCondition = Number(conditionValue);
        if (isNaN(numField) || isNaN(numCondition)) {
          return false;
        }
        return numField < numCondition;
      }

      case 'greaterThanOrEqual': {
        const numField = Number(fieldValue);
        const numCondition = Number(conditionValue);
        if (isNaN(numField) || isNaN(numCondition)) {
          return false;
        }
        return numField >= numCondition;
      }

      case 'lessThanOrEqual': {
        const numField = Number(fieldValue);
        const numCondition = Number(conditionValue);
        if (isNaN(numField) || isNaN(numCondition)) {
          return false;
        }
        return numField <= numCondition;
      }

      case 'isEmpty':
        return this.isEmpty(fieldValue);

      case 'isNotEmpty':
        return !this.isEmpty(fieldValue);

      case 'in':
        if (!Array.isArray(conditionValue)) {
          return false;
        }
        return conditionValue.some(
          (v) => this.normalizeValue(v) === this.normalizeValue(fieldValue)
        );

      case 'notIn':
        if (!Array.isArray(conditionValue)) {
          return true;
        }
        return !conditionValue.some(
          (v) => this.normalizeValue(v) === this.normalizeValue(fieldValue)
        );

      case 'between':
        if (secondValue === undefined || secondValue === null) {
          return false;
        }
        const numValue = Number(fieldValue);
        const minValue = Number(conditionValue);
        const maxValue = Number(secondValue);
        if (isNaN(numValue) || isNaN(minValue) || isNaN(maxValue)) {
          return false;
        }
        return numValue >= minValue && numValue <= maxValue;

      default:
        return false;
    }
  }

  /**
   * Normalizes a value for comparison (handles case-insensitive string comparison)
   */
  private normalizeValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    return value;
  }

  /**
   * Checks if a value is empty
   */
  private isEmpty(value: unknown): boolean {
    if (value == null) {
      return true;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return true;
    }
    if (Array.isArray(value) && value.length === 0) {
      return true;
    }
    return false;
  }
}
