/**
 * Dynamic Component Engine — Zod Schema → ComponentDefinition Migration
 *
 * Inspects existing Zod schemas from portal/schemas.ts and generates
 * ComponentDefinition objects for each field. This bridges the legacy
 * hand-written schemas with the dynamic engine's registry-backed system.
 */

import type { z } from 'zod';
import type {
  ComponentDefinition,
  ComponentCategory,
  ValidationRule,
  JSONSchema7,
} from './types';
import { inferRenderer } from './schema-adaptive';
import { ComponentRegistry } from './component-registry';

// ---------------------------------------------------------------------------
// Zod introspection helpers
// ---------------------------------------------------------------------------

type ZodShape = Record<string, z.ZodTypeAny>;

interface ZodFieldInfo {
  fieldName: string;
  typeName: string;
  isOptional: boolean;
  enumValues?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  description?: string;
  innerTypeName?: string;
  innerEnumValues?: string[];
}

/**
 * Unwrap Zod wrappers (optional, default, nullable, effects/refinements)
 * to get to the underlying type definition.
 */
function unwrapZodType(zodType: z.ZodTypeAny): z.ZodTypeAny {
  const def = (zodType as unknown as { _def: Record<string, unknown> })._def;

  // ZodOptional / ZodNullable / ZodDefault all wrap an `innerType`
  if (def.innerType) {
    return unwrapZodType(def.innerType as z.ZodTypeAny);
  }

  // ZodEffects (refine, transform) wraps a `schema`
  if (def.schema) {
    return unwrapZodType(def.schema as z.ZodTypeAny);
  }

  // ZodUnion (e.g. .or(z.literal(""))) — take the first option
  if (def.options && Array.isArray(def.options) && def.options.length > 0) {
    return unwrapZodType(def.options[0] as z.ZodTypeAny);
  }

  return zodType;
}

function getZodTypeName(zodType: z.ZodTypeAny): string {
  const def = (zodType as unknown as { _def: Record<string, unknown> })._def;
  const typeName = (def.typeName as string) ?? '';
  return typeName.replace('Zod', '');
}

/**
 * Extract field-level metadata from a single Zod type.
 */
function inspectZodField(fieldName: string, zodType: z.ZodTypeAny): ZodFieldInfo {
  const rawDef = (zodType as unknown as { _def: Record<string, unknown> })._def;
  const isOptional = getZodTypeName(zodType) === 'Optional' ||
    rawDef.innerType !== undefined && getZodTypeName(zodType) === 'Optional';

  const unwrapped = unwrapZodType(zodType);
  const def = (unwrapped as unknown as { _def: Record<string, unknown> })._def;
  const typeName = getZodTypeName(unwrapped);

  const info: ZodFieldInfo = {
    fieldName,
    typeName,
    isOptional: isOptional || getZodTypeName(zodType) === 'Optional',
  };

  // Check if original type is optional
  const origTypeName = getZodTypeName(zodType);
  if (origTypeName === 'Optional' || origTypeName === 'Default') {
    info.isOptional = true;
  }

  // Enum values
  if (typeName === 'Enum' || typeName === 'NativeEnum') {
    info.enumValues = (def.values as string[]) ?? [];
  }

  // String checks
  if (typeName === 'String' && def.checks && Array.isArray(def.checks)) {
    for (const check of def.checks as Array<{ kind: string; value?: unknown }>) {
      if (check.kind === 'min') info.minLength = check.value as number;
      if (check.kind === 'max') info.maxLength = check.value as number;
      if (check.kind === 'email') info.description = 'email';
      if (check.kind === 'url') info.description = 'url';
    }
  }

  // Number checks
  if ((typeName === 'Number' || typeName === 'Coerce') && def.checks && Array.isArray(def.checks)) {
    for (const check of def.checks as Array<{ kind: string; value?: unknown }>) {
      if (check.kind === 'min') info.minimum = check.value as number;
      if (check.kind === 'max') info.maximum = check.value as number;
    }
  }

  // Array item inspection
  if (typeName === 'Array' && def.type) {
    const itemType = unwrapZodType(def.type as z.ZodTypeAny);
    info.innerTypeName = getZodTypeName(itemType);
    const itemDef = (itemType as unknown as { _def: Record<string, unknown> })._def;
    if (info.innerTypeName === 'Enum') {
      info.innerEnumValues = (itemDef.values as string[]) ?? [];
    }
  }

  return info;
}

// ---------------------------------------------------------------------------
// ZodFieldInfo → JSONSchema7 + renderer mapping
// ---------------------------------------------------------------------------

function fieldInfoToJsonSchema(info: ZodFieldInfo): JSONSchema7 {
  if (info.enumValues) {
    return { type: 'string', enum: info.enumValues };
  }

  switch (info.typeName) {
    case 'String':
      return {
        type: 'string',
        ...(info.minLength !== undefined ? { minLength: info.minLength } : {}),
        ...(info.maxLength !== undefined ? { maxLength: info.maxLength } : {}),
        ...(info.description === 'email' ? { format: 'email' } : {}),
        ...(info.description === 'url' ? { format: 'uri' } : {}),
      };
    case 'Number':
    case 'Coerce':
      return {
        type: 'number',
        ...(info.minimum !== undefined ? { minimum: info.minimum } : {}),
        ...(info.maximum !== undefined ? { maximum: info.maximum } : {}),
      };
    case 'Boolean':
      return { type: 'boolean' };
    case 'Array':
      return {
        type: 'array',
        items: info.innerEnumValues
          ? { type: 'string', enum: info.innerEnumValues }
          : { type: 'string' },
      };
    default:
      return { type: 'string' };
  }
}

function buildValidations(info: ZodFieldInfo): ValidationRule[] {
  const rules: ValidationRule[] = [];

  if (!info.isOptional) {
    rules.push({
      rule: 'required',
      message_en: `${humanize(info.fieldName)} is required`,
      message_ar: `${info.fieldName} مطلوب`,
    });
  }
  if (info.minLength !== undefined) {
    rules.push({
      rule: 'min',
      value: info.minLength,
      message_en: `Minimum ${info.minLength} characters`,
      message_ar: `الحد الأدنى ${info.minLength} أحرف`,
    });
  }
  if (info.maxLength !== undefined) {
    rules.push({
      rule: 'max',
      value: info.maxLength,
      message_en: `Maximum ${info.maxLength} characters`,
      message_ar: `الحد الأقصى ${info.maxLength} أحرف`,
    });
  }
  if (info.minimum !== undefined) {
    rules.push({
      rule: 'min',
      value: info.minimum,
      message_en: `Minimum value is ${info.minimum}`,
      message_ar: `الحد الأدنى ${info.minimum}`,
    });
  }
  if (info.maximum !== undefined) {
    rules.push({
      rule: 'max',
      value: info.maximum,
      message_en: `Maximum value is ${info.maximum}`,
      message_ar: `الحد الأقصى ${info.maximum}`,
    });
  }

  return rules;
}

function humanize(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

// ---------------------------------------------------------------------------
// Main migration function
// ---------------------------------------------------------------------------

/**
 * Inspect a Zod object schema and generate ComponentDefinition objects
 * for each field, using the schema-adaptive renderer inference.
 *
 * @param schema  A Zod object schema (e.g. `organizationSchema`)
 * @param flowId  The flow these components belong to (used for slug prefixing)
 * @param stageId The stage within the flow
 * @returns Array of ComponentDefinition objects ready for registry insertion
 */
export function migrateZodSchema(
  schema: z.ZodObject<ZodShape>,
  flowId: string,
  stageId: string,
): ComponentDefinition[] {
  const shape = schema.shape as ZodShape;
  const definitions: ComponentDefinition[] = [];

  let order = 0;
  for (const [fieldName, zodField] of Object.entries(shape)) {
    const info = inspectZodField(fieldName, zodField);
    const jsonSchema = fieldInfoToJsonSchema(info);
    const { rendererKey, config } = inferRenderer(jsonSchema, fieldName);
    const slug = `${flowId}-${stageId}-${fieldName}`;
    const label = humanize(fieldName);

    const definition: ComponentDefinition = {
      id: `migrated-${slug}`,
      nodeType: 'TEMPLATE',
      category: 'field' as ComponentCategory,
      slug,
      renderer: rendererKey,
      dataSchema: jsonSchema,
      defaultConfig: {
        ...config,
        fieldName,
        order: order++,
      },
      validations: buildValidations(info),
      i18n: {
        en: {
          label,
          placeholder: `Enter ${label.toLowerCase()}...`,
        },
        ar: {
          label: fieldName,
          placeholder: `أدخل ${fieldName}...`,
        },
      },
      version: 1,
      status: 'published',
    };

    definitions.push(definition);
  }

  return definitions;
}

// ---------------------------------------------------------------------------
// Seed registry helper
// ---------------------------------------------------------------------------

/**
 * Convenience function that migrates all exported portal schemas and
 * persists the resulting ComponentDefinitions via the ComponentRegistry.
 *
 * Call this once during engine initialization to backfill the registry
 * with definitions derived from existing Zod schemas.
 */
export async function seedRegistryFromSchema(
  registry: ComponentRegistry,
  schemas: { name: string; schema: z.ZodObject<ZodShape> }[],
  flowId: string = 'portal',
): Promise<ComponentDefinition[]> {
  const allDefinitions: ComponentDefinition[] = [];

  for (const { name, schema } of schemas) {
    const stageId = name.replace(/Schema$/, '');
    const definitions = migrateZodSchema(schema, flowId, stageId);

    for (const def of definitions) {
      // Check if already exists to avoid duplicates on re-runs
      const existing = await registry.getDefinition(def.id);
      if (!existing) {
        await registry.createDefinition({
          slug: def.slug,
          category: def.category,
          renderer: def.renderer,
          dataSchema: def.dataSchema,
          defaultConfig: def.defaultConfig,
          validations: def.validations,
          i18n: def.i18n,
          composedOf: def.composedOf,
          status: def.status,
        });
      }
    }

    allDefinitions.push(...definitions);
  }

  return allDefinitions;
}
