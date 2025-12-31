/**
 * OData Query Parameter Utilities
 * Implements support for OData standard query parameters
 * Reference: https://www.odata.org/
 */

export interface ODataOptions {
  select?: string;
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
}

/**
 * Select specific fields from objects
 * @param data Array of objects
 * @param fields Comma-separated field names (e.g., "StationCode,Name")
 * @returns Array of objects with only selected fields
 */
export function applySelect<T extends Record<string, unknown>>(
  data: T[],
  fields: string
): Record<string, unknown>[] {
  if (!fields || !fields.trim()) {
    return data;
  }

  const fieldList = fields.split(',').map((f) => f.trim());

  return data.map((item) => {
    const result: Record<string, unknown> = {};
    for (const field of fieldList) {
      if (field in item) {
        result[field] = item[field];
      }
    }
    return result;
  });
}

/**
 * Filter data based on OData filter expression
 * Supports simple equality filters: "City=台北市"
 * @param data Array of objects
 * @param filter Filter expression (e.g., "City=台北市")
 * @returns Filtered array
 */
export function applyFilter<T extends Record<string, unknown>>(
  data: T[],
  filter: string
): T[] {
  if (!filter || !filter.trim()) {
    return data;
  }

  // Parse simple equality filter: "Field=Value"
  const match = filter.match(/^(\w+)=(.+)$/);
  if (!match) {
    throw new Error(`Invalid filter format: "${filter}". Expected "Field=Value"`);
  }

  const [, field, value] = match;

  return data.filter((item) => {
    const itemValue = item[field];
    // Handle nested objects (e.g., StationName.Zh_tw)
    if (typeof itemValue === 'object' && itemValue !== null) {
      return false; // Skip complex comparisons for now
    }
    return String(itemValue).trim() === value.trim();
  });
}

/**
 * Sort data based on field
 * @param data Array of objects
 * @param field Field name to sort by (prefix with '-' for descending)
 * @returns Sorted array
 */
export function applyOrderBy<T extends Record<string, unknown>>(
  data: T[],
  field: string
): T[] {
  if (!field || !field.trim()) {
    return data;
  }

  const desc = field.startsWith('-');
  const sortField = desc ? field.substring(1) : field;

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (aVal === undefined || bVal === undefined) {
      return 0;
    }

    // Handle string comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }

    // Handle numeric comparison
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return desc ? bVal - aVal : aVal - bVal;
    }

    return 0;
  });

  return sorted;
}

/**
 * Apply pagination (top/skip)
 * @param data Array of objects
 * @param top Maximum number of items to return
 * @param skip Number of items to skip
 * @returns Paginated array
 */
export function applyPagination<T>(data: T[], top?: number, skip?: number): T[] {
  let result = data;

  if (skip !== undefined && skip > 0) {
    result = result.slice(skip);
  }

  if (top !== undefined && top > 0) {
    result = result.slice(0, top);
  }

  return result;
}

/**
 * Apply all OData options in the correct order
 * Order: filter → select → orderby → pagination
 * @param data Array of objects
 * @param options OData options
 * @returns Transformed array
 */
export function applyODataOptions<T extends Record<string, unknown>>(
  data: T[],
  options: ODataOptions
): Record<string, unknown>[] | T[] {
  let result: T[] | Record<string, unknown>[] = data;

  // 1. Apply filter first (reduces data set)
  if (options.filter) {
    result = applyFilter(result as T[], options.filter);
  }

  // 2. Apply orderby (sort before pagination)
  if (options.orderby) {
    result = applyOrderBy(result as T[], options.orderby);
  }

  // 3. Apply select (field selection)
  if (options.select) {
    result = applySelect(result as T[], options.select);
  }

  // 4. Apply pagination (skip and top)
  if (options.top !== undefined || options.skip !== undefined) {
    result = applyPagination(result, options.top, options.skip);
  }

  return result;
}
