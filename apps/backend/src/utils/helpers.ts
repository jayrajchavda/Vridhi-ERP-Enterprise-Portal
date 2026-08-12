/**
 * Serializes Prisma Decimal fields to strings in objects/arrays
 * to ensure consistent, precision-safe JSON output.
 */
export function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'object' && 'toFixed' in (obj as any)) {
    return (obj as any).toString() as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeDecimals) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj as object)) {
      result[key] = serializeDecimals((obj as any)[key]);
    }
    return result;
  }
  return obj;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
