/**
 * PreviewRenderer — Live preview of ComponentDefinition or FlowDefinition
 *
 * Renders a read-only preview showing how a component or flow would appear
 * at runtime, using sample data. Useful for the Control Board's design mode.
 */

import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { rendererRegistry } from '../renderer-registry';
import type {
  ComponentDefinition,
  FlowDefinition,
  StageDefinition,
  DynamicComponentProps,
  I18nLabels,
} from '../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PreviewRendererProps {
  /** Render a single component definition */
  definition?: ComponentDefinition;
  /** Render a full flow (stage-by-stage mini view) */
  flow?: FlowDefinition;
  /** Display locale */
  locale?: 'en' | 'ar';
  /** Optional class name for the outer wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Sample data generator
// ---------------------------------------------------------------------------

function generateSampleValue(definition: ComponentDefinition): unknown {
  const schema = definition.dataSchema;
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }

  switch (type) {
    case 'string':
      if (schema.format === 'date' || schema.format === 'date-time') {
        return '2026-01-15';
      }
      if (schema.format === 'email') {
        return 'user@example.com';
      }
      if (schema.format === 'uri' || schema.format === 'url') {
        return 'https://example.com';
      }
      return 'Sample text';
    case 'number':
    case 'integer':
      return schema.minimum ?? 42;
    case 'boolean':
      return true;
    case 'array':
      if (schema.items?.enum && schema.items.enum.length > 0) {
        return [schema.items.enum[0]];
      }
      return [];
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Component Preview
// ---------------------------------------------------------------------------

function ComponentPreview({
  definition,
  locale,
}: {
  definition: ComponentDefinition;
  locale: 'en' | 'ar';
}) {
  const [value, setValue] = useState<unknown>(() =>
    generateSampleValue(definition),
  );

  const i18n: I18nLabels = locale === 'ar' ? definition.i18n.ar : definition.i18n.en;

  const Renderer = useMemo(() => {
    return (
      rendererRegistry.get(definition.renderer) ??
      rendererRegistry.getFallback()
    );
  }, [definition.renderer]);

  const props: DynamicComponentProps = {
    instanceId: `preview-${definition.id}`,
    config: definition.defaultConfig,
    validations: definition.validations,
    i18n,
    value,
    onChange: setValue,
    errors: [],
    disabled: false,
    locale,
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {i18n.label}
          </CardTitle>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-xs">
              {definition.renderer}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {definition.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Renderer {...props} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stage Mini Preview
// ---------------------------------------------------------------------------

function StageMiniPreview({
  stage,
  index,
  isActive,
  locale,
}: {
  stage: StageDefinition;
  index: number;
  isActive: boolean;
  locale: 'en' | 'ar';
}) {
  const label =
    locale === 'ar' ? stage.metadata.label_ar : stage.metadata.label_en;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-border bg-muted/30'
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {stage.componentOrder.length} component
          {stage.componentOrder.length !== 1 ? 's' : ''}
          {stage.isTerminal && ' · Terminal'}
        </p>
      </div>
      {stage.transitions.length > 0 && (
        <Badge variant="outline" className="text-xs">
          {stage.transitions.length} transition
          {stage.transitions.length !== 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flow Preview
// ---------------------------------------------------------------------------

function FlowPreview({
  flow,
  locale,
}: {
  flow: FlowDefinition;
  locale: 'en' | 'ar';
}) {
  const name =
    locale === 'ar' ? flow.metadata.name_ar : flow.metadata.name_en;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{name}</CardTitle>
          <div className="flex gap-1">
            <Badge variant="secondary" className="text-xs">
              v{flow.version}
            </Badge>
            <Badge
              variant={flow.status === 'active' ? 'default' : 'outline'}
              className="text-xs"
            >
              {flow.status}
            </Badge>
          </div>
        </div>
        {flow.metadata.description && (
          <p className="text-sm text-muted-foreground">
            {flow.metadata.description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {flow.stages.map((stage, i) => (
            <StageMiniPreview
              key={stage.id}
              stage={stage}
              index={i}
              isActive={stage.id === flow.entryStageId}
              locale={locale}
            />
          ))}
        </div>
        {flow.stages.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No stages defined yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export function PreviewRenderer({
  definition,
  flow,
  locale = 'en',
  className,
}: PreviewRendererProps) {
  if (!definition && !flow) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">
          No definition or flow provided for preview.
        </p>
      </div>
    );
  }

  return (
    <div className={className} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {definition && (
        <ComponentPreview definition={definition} locale={locale} />
      )}
      {flow && <FlowPreview flow={flow} locale={locale} />}
    </div>
  );
}
