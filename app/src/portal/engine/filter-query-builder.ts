/**
 * Dynamic Component Engine — Filter Query Builder for Mujarrad
 *
 * Converts FilterState[] into query parameters compatible with
 * the MujarradClient's listNodes API. Since Mujarrad's listNodes
 * currently supports `nodeType` and `search` parameters, this builder
 * applies a two-tier strategy:
 *
 *  1. Server-side: extract any nodeType filter and text-based filters
 *     into listNodes query params (nodeType, search).
 *  2. Client-side: return a predicate function that post-filters the
 *     results for operators Mujarrad doesn't natively support.
 *
 * This keeps the API contract clean while still enabling rich filtering
 * on the engine's FilterDimension system.
 */

import type { FilterState, FilterOperator } from './types';
import type { NodeType, MujarradNode } from '../lib/mujarrad-client';

// ---------------------------------------------------------------------------
// Query params output (maps to MujarradClient.listNodes options)
// ---------------------------------------------------------------------------

export interface MujarradQueryParams {
  nodeType?: NodeType;
  search?: string;
}

export interface MujarradQueryResult {
  /** Parameters to pass to MujarradClient.listNodes() */
  params: MujarradQueryParams;
  /** Client-side predicate for filters that cannot be pushed to the server */
  predicate: (node: MujarradNode) => boolean;
}

// ---------------------------------------------------------------------------
// Operator evaluators
// ---------------------------------------------------------------------------

function resolveFieldValue(
  node: MujarradNode,
  field: string,
): unknown {
  // Top-level node fields
  if (field in node) {
    return (node as unknown as Record<string, unknown>)[field];
  }
  // Dot-path into nodeDetails
  const parts = field.split('.');
  let current: unknown = node.nodeDetails;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function evaluateOperator(
  fieldValue: unknown,
  operator: FilterOperator,
  filterValue: unknown,
): boolean {
  switch (operator) {
    case 'eq':
      return fieldValue === filterValue;

    case 'neq':
      return fieldValue !== filterValue;

    case 'gt':
      return typeof fieldValue === 'number' && typeof filterValue === 'number'
        ? fieldValue > filterValue
        : String(fieldValue) > String(filterValue);

    case 'lt':
      return typeof fieldValue === 'number' && typeof filterValue === 'number'
        ? fieldValue < filterValue
        : String(fieldValue) < String(filterValue);

    case 'gte':
      return typeof fieldValue === 'number' && typeof filterValue === 'number'
        ? fieldValue >= filterValue
        : String(fieldValue) >= String(filterValue);

    case 'lte':
      return typeof fieldValue === 'number' && typeof filterValue === 'number'
        ? fieldValue <= filterValue
        : String(fieldValue) <= String(filterValue);

    case 'in':
      return Array.isArray(filterValue) && filterValue.includes(fieldValue);

    case 'contains':
      if (typeof fieldValue === 'string' && typeof filterValue === 'string') {
        return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(filterValue);
      }
      return false;

    case 'overlaps':
      if (Array.isArray(fieldValue) && Array.isArray(filterValue)) {
        return filterValue.some((v) => fieldValue.includes(v));
      }
      return false;

    case 'all_of':
      if (Array.isArray(fieldValue) && Array.isArray(filterValue)) {
        return filterValue.every((v) => fieldValue.includes(v));
      }
      return false;

    case 'between':
      if (
        typeof fieldValue === 'number' &&
        Array.isArray(filterValue) &&
        filterValue.length === 2
      ) {
        return fieldValue >= (filterValue[0] as number) &&
          fieldValue <= (filterValue[1] as number);
      }
      return false;

    case 'matches':
      if (typeof fieldValue === 'string' && typeof filterValue === 'string') {
        try {
          return new RegExp(filterValue, 'i').test(fieldValue);
        } catch {
          return false;
        }
      }
      return false;

    case 'exists':
      return filterValue
        ? fieldValue !== undefined && fieldValue !== null
        : fieldValue === undefined || fieldValue === null;

    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

/**
 * Convert an array of FilterState into Mujarrad-compatible query parameters
 * plus a client-side predicate for advanced filtering.
 *
 * @example
 * ```ts
 * const { params, predicate } = buildMujarradQuery(activeFilters);
 * const nodes = await client.listNodes(params);
 * const filtered = nodes.filter(predicate);
 * ```
 */
export function buildMujarradQuery(filters: FilterState[]): MujarradQueryResult {
  const params: MujarradQueryParams = {};
  const clientFilters: FilterState[] = [];

  for (const filter of filters) {
    // Server-side: nodeType exact match
    if (filter.field === 'nodeType' && filter.operator === 'eq' && typeof filter.value === 'string') {
      params.nodeType = filter.value as NodeType;
      continue;
    }

    // Server-side: text search (maps to Mujarrad's `search` param)
    if (
      filter.field === 'title' &&
      (filter.operator === 'contains' || filter.operator === 'eq') &&
      typeof filter.value === 'string'
    ) {
      // Mujarrad search is additive — concatenate terms
      params.search = params.search
        ? `${params.search} ${filter.value}`
        : filter.value;
      continue;
    }

    // Everything else must be evaluated client-side
    clientFilters.push(filter);
  }

  const predicate = (node: MujarradNode): boolean => {
    return clientFilters.every((filter) => {
      const fieldValue = resolveFieldValue(node, filter.field);
      return evaluateOperator(fieldValue, filter.operator, filter.value);
    });
  };

  return { params, predicate };
}
