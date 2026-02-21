/**
 * Operators for single condition evaluation
 */
export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'in'
  | 'notIn'
  | 'between';

/**
 * Logical operators for grouping conditions
 */
export type LogicalOperator = 'and' | 'or';

/**
 * A single condition comparing a field to a value
 */
export interface SingleCondition {
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean | string[];
  secondValue?: string | number; // For 'between' operator
}

/**
 * A group of conditions combined with AND/OR logic
 */
export interface ConditionGroup {
  logicalOperator: LogicalOperator;
  conditions: (SingleCondition | ConditionGroup)[];
}

/**
 * Auto-assign condition - can be a single condition or a group
 */
export type AutoAssignCondition = SingleCondition | ConditionGroup;

/**
 * Labels for condition operators (Polish)
 */
export const ConditionOperatorLabels: Record<ConditionOperator, string> = {
  equals: 'równa się',
  notEquals: 'różni się od',
  contains: 'zawiera',
  notContains: 'nie zawiera',
  greaterThan: 'większe niż',
  lessThan: 'mniejsze niż',
  greaterThanOrEqual: 'większe lub równe',
  lessThanOrEqual: 'mniejsze lub równe',
  isEmpty: 'jest puste',
  isNotEmpty: 'nie jest puste',
  in: 'jest jednym z',
  notIn: 'nie jest żadnym z',
  between: 'między',
};

/**
 * Labels for logical operators (Polish)
 */
export const LogicalOperatorLabels: Record<LogicalOperator, string> = {
  and: 'oraz',
  or: 'lub',
};

/**
 * Type guard to check if a condition is a ConditionGroup
 */
export function isConditionGroup(condition: AutoAssignCondition): condition is ConditionGroup {
  return 'logicalOperator' in condition && 'conditions' in condition;
}
