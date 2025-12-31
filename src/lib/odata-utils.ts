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

export interface GeoPoint {
  lat: number;
  lon: number;
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
 * Calculate distance between two geographic points using Haversine formula
 * @param point1 First geographic point (lat, lon)
 * @param point2 Second geographic point (lat, lon)
 * @returns Distance in meters
 */
export function calculateHaversineDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = Math.PI / 180;

  const lat1 = point1.lat * toRad;
  const lat2 = point2.lat * toRad;
  const deltaLat = (point2.lat - point1.lat) * toRad;
  const deltaLon = (point2.lon - point1.lon) * toRad;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Filter data by geographic proximity
 * @param data Array of objects with position data
 * @param centerPoint Center point for the search
 * @param radiusMeters Search radius in meters
 * @param positionFieldPath Path to position field (e.g., "StationPosition" or "Position")
 * @returns Filtered array of nearby items
 */
export function applyNearbyFilter<T extends Record<string, unknown>>(
  data: T[],
  centerPoint: GeoPoint,
  radiusMeters: number,
  positionFieldPath: string = 'StationPosition'
): T[] {
  return data.filter((item) => {
    const position = getNestedProperty(item, positionFieldPath);
    if (!position || typeof position !== 'object') {
      return false;
    }

    const pos = position as Record<string, unknown>;
    const lat = pos['PositionLat'] ?? pos['lat'];
    const lon = pos['PositionLon'] ?? pos['lon'];

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return false;
    }

    const point: GeoPoint = { lat, lon };
    const distance = calculateHaversineDistance(centerPoint, point);

    return distance <= radiusMeters;
  });
}

/**
 * Get nested property from object using dot notation
 * @param obj Object to search
 * @param path Path to property (e.g., "user.address.city")
 * @returns Property value or undefined
 */
function getNestedProperty(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, prop) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[prop];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Apply all OData options in the correct order
 * Order: filter → nearby → select → orderby → pagination
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
