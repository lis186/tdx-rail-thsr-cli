import type { Operator } from '../types/api.js';
import { applyODataOptions, type ODataOptions } from './odata-utils.js';

/**
 * OperatorResolver - resolves rail operators
 * Supports querying and filtering operator information
 */
export class OperatorResolver {
  private operators: Operator[];

  constructor(operators: Operator[]) {
    this.operators = operators;
  }

  /**
   * Get all operators
   */
  getAllOperators(): Operator[] {
    return [...this.operators];
  }

  /**
   * Get operator by ID
   */
  getOperatorById(operatorId: string): Operator | null {
    return (
      this.operators.find(
        (op) => op.OperatorID.toLowerCase() === operatorId.toLowerCase()
      ) || null
    );
  }

  /**
   * Get operator by code
   */
  getOperatorByCode(operatorCode: string): Operator | null {
    return (
      this.operators.find(
        (op) => op.OperatorCode.toLowerCase() === operatorCode.toLowerCase()
      ) || null
    );
  }

  /**
   * Search operators by name
   */
  searchOperators(query: string): Operator[] {
    const normalizedQuery = query.toLowerCase();
    return this.operators.filter(
      (op) =>
        op.OperatorName.Zh_tw.toLowerCase().includes(normalizedQuery) ||
        op.OperatorName.En.toLowerCase().includes(normalizedQuery) ||
        op.OperatorCode.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Get all operators with OData query options
   * Supports $select, $filter, $orderby, $top, $skip
   */
  getAllOperatorsWithOData(
    options: ODataOptions
  ): (Operator | Record<string, unknown>)[] {
    const operatorsAsRecords = this.operators as unknown as Record<string, unknown>[];
    return applyODataOptions(operatorsAsRecords, options) as (
      | Operator
      | Record<string, unknown>
    )[];
  }
}
