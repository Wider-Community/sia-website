/**
 * Dynamic Component Engine — Schema-Adaptive Engine
 *
 * Parses JSON Schema 7 and maps types to appropriate renderers.
 * Also derives filter dimensions from schema properties.
 * This is what handles unknown/evolving schemas from data extraction.
 */

import type {
  JSONSchema7,
  FilterDimension,
  FilterOperator,
  DynamicComponentProps,
} from './types';
import { rendererRegistry } from './renderer-registry';

// ---------------------------------------------------------------------------
// Schema → Renderer mapping
// ---------------------------------------------------------------------------

interface SchemaRendererMapping {
  rendererKey: string;
  config: Record<string, unknown>;
}

/**
 * Given a JSON Schema property, determine the best renderer and config.
 */
export function inferRenderer(
  schema: JSONSchema7,
  fieldName?: string,
): SchemaRendererMapping {
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  // Enum → Select
  if (schema.enum && schema.enum.length > 0) {
    return {
      rendererKey: 'SelectRenderer',
      config: {
        options: schema.enum.map((v) => ({
          value: String(v),
          label: String(v),
        })),
      },
    };
  }

  switch (type) {
    case 'string': {
      // Check format hints
      if (schema.format === 'date' || schema.format === 'date-time') {
        return { rendererKey: 'DatePickerRenderer', config: {} };
      }
      if (schema.format === 'uri' || schema.format === 'url') {
        return { rendererKey: 'TextFieldRenderer', config: {} };
      }
      // Long text heuristic
      if (
        (schema.maxLength && schema.maxLength > 200) ||
        fieldName?.includes('description') ||
        fieldName?.includes('content') ||
        fieldName?.includes('notes')
      ) {
        return { rendererKey: 'TextAreaRenderer', config: {} };
      }
      return { rendererKey: 'TextFieldRenderer', config: {} };
    }

    case 'number':
    case 'integer':
      return {
        rendererKey: 'NumberFieldRenderer',
        config: {
          min: schema.minimum,
          max: schema.maximum,
        },
      };

    case 'boolean':
      return { rendererKey: 'ToggleRenderer', config: {} };

    case 'array': {
      // If items have enum → MultiSelect
      if (schema.items?.enum) {
        return {
          rendererKey: 'MultiSelectRenderer',
          config: {
            options: schema.items.enum.map((v) => ({
              value: String(v),
              label: String(v),
            })),
          },
        };
      }
      // Array of strings without enum → still MultiSelect with free input
      return { rendererKey: 'MultiSelectRenderer', config: { options: [] } };
    }

    case 'object':
      // Objects recurse — use FallbackRenderer for now (CompositeRenderer in later phase)
      return { rendererKey: 'FallbackRenderer', config: {} };

    default:
      return { rendererKey: 'FallbackRenderer', config: {} };
  }
}

/**
 * Resolve a renderer component from a schema, using the registry.
 * Falls back gracefully if the inferred renderer isn't registered.
 */
export function resolveRendererForSchema(
  schema: JSONSchema7,
  fieldName?: string,
): {
  Component: React.ComponentType<DynamicComponentProps>;
  config: Record<string, unknown>;
} {
  const mapping = inferRenderer(schema, fieldName);
  const Component =
    rendererRegistry.get(mapping.rendererKey) ??
    rendererRegistry.getFallback();
  return { Component, config: mapping.config };
}

// ---------------------------------------------------------------------------
// Schema → Filter Dimensions
// ---------------------------------------------------------------------------

const TYPE_FILTER_OPERATORS: Record<string, FilterOperator[]> = {
  string: ['eq', 'neq', 'contains', 'matches'],
  number: ['eq', 'gt', 'lt', 'gte', 'lte', 'between'],
  integer: ['eq', 'gt', 'lt', 'gte', 'lte', 'between'],
  boolean: ['eq'],
  array: ['contains', 'overlaps', 'all_of'],
};

const TYPE_FILTER_INPUT: Record<string, FilterDimension['inputType']> = {
  string: 'text',
  number: 'number',
  integer: 'number',
  boolean: 'toggle',
  array: 'multi-select',
};

/**
 * Derive filterable dimensions from a JSON Schema.
 * Recursively processes nested objects with dot-path field names.
 */
export function deriveFilterDimensions(
  schema: JSONSchema7,
  prefix?: string,
): FilterDimension[] {
  const dimensions: FilterDimension[] = [];

  if (!schema.properties) return dimensions;

  for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
    const fullPath = prefix ? `${prefix}.${fieldName}` : fieldName;
    const type = Array.isArray(fieldSchema.type)
      ? fieldSchema.type[0]
      : fieldSchema.type;

    if (type === 'object' && fieldSchema.properties) {
      // Recurse into nested objects
      dimensions.push(...deriveFilterDimensions(fieldSchema, fullPath));
      continue;
    }

    const label = fieldSchema.title ?? fieldName;
    const operators = TYPE_FILTER_OPERATORS[type ?? 'string'] ?? ['eq'];
    let inputType = TYPE_FILTER_INPUT[type ?? 'string'] ?? 'text';

    // Enum → select input
    let options: FilterDimension['options'];
    if (fieldSchema.enum) {
      inputType = 'select';
      options = fieldSchema.enum.map((v) => ({
        value: v,
        label_en: String(v),
        label_ar: String(v),
      }));
    }

    // Date format → date input
    if (
      type === 'string' &&
      (fieldSchema.format === 'date' || fieldSchema.format === 'date-time')
    ) {
      inputType = 'date';
    }

    dimensions.push({
      field: fullPath,
      label_en: label,
      label_ar: label, // TODO: i18n from component definition
      operators,
      inputType,
      options,
    });
  }

  return dimensions;
}
