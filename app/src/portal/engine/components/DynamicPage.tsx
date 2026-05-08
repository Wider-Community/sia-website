/**
 * DynamicPage — renders an entire page from a PageConfig.
 *
 * Resolves all component instances per section via useFlowStage,
 * supports three page layouts (single-column, two-column, tabs)
 * and three section layouts (stack, grid-2, grid-3).
 *
 * Uses PageShell / PageHeader patterns from the portal.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PageShell } from '../../components/PageShell';
import { PageHeader } from '../../components/PageHeader';
import { useFlowStage } from '../hooks';
import type { DynamicComponentProps, ResolvedComponent } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PageConfig {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string;
  layout: 'single-column' | 'two-column' | 'tabs';
  sections: PageSection[];
}

export interface PageSection {
  id: string;
  title_en: string;
  title_ar: string;
  componentInstanceIds: string[];
  layout?: 'stack' | 'grid-2' | 'grid-3';
}

export interface DynamicPageProps {
  config: PageConfig;
  locale: 'en' | 'ar';
  values?: Record<string, unknown>;
  onChange?: (instanceId: string, value: unknown) => void;
  onAction?: (action: string, payload?: unknown) => void;
  errors?: Record<string, string[]>;
  disabled?: boolean;
  backTo?: string;
  actions?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------

interface SectionRendererProps {
  section: PageSection;
  locale: 'en' | 'ar';
  values: Record<string, unknown>;
  onChange: (instanceId: string, value: unknown) => void;
  onAction?: (action: string, payload?: unknown) => void;
  errors: Record<string, string[]>;
  disabled: boolean;
}

function SectionRenderer({
  section,
  locale,
  values,
  onChange,
  onAction,
  errors,
  disabled,
}: SectionRendererProps) {
  const { components, loading, error } = useFlowStage(
    section.componentInstanceIds,
    locale,
  );

  const isRtl = locale === 'ar';
  const title = isRtl ? section.title_ar : section.title_en;
  const sectionLayout = section.layout ?? 'stack';

  const layoutClass = useMemo(() => {
    switch (sectionLayout) {
      case 'grid-2':
        return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
      case 'grid-3':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
      case 'stack':
      default:
        return 'space-y-4';
    }
  }, [sectionLayout]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-sm text-destructive">
            {locale === 'ar' ? 'خطأ في تحميل القسم' : 'Error loading section'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={layoutClass}>
          {components.map((comp) => (
            <ComponentWrapper
              key={comp.instanceId}
              resolved={comp}
              locale={locale}
              value={values[comp.instanceId]}
              onChange={(val) => onChange(comp.instanceId, val)}
              onAction={onAction}
              errors={errors[comp.instanceId]}
              disabled={disabled}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Component wrapper — renders a single ResolvedComponent
// ---------------------------------------------------------------------------

interface ComponentWrapperProps {
  resolved: ResolvedComponent;
  locale: 'en' | 'ar';
  value: unknown;
  onChange: (value: unknown) => void;
  onAction?: (action: string, payload?: unknown) => void;
  errors?: string[];
  disabled: boolean;
}

function ComponentWrapper({
  resolved,
  locale,
  value,
  onChange,
  onAction,
  errors,
  disabled,
}: ComponentWrapperProps) {
  const { Component } = resolved;

  const props: DynamicComponentProps = {
    instanceId: resolved.instanceId,
    config: resolved.config,
    validations: resolved.validations,
    i18n: resolved.i18n,
    value,
    onChange,
    onAction,
    errors,
    disabled,
    locale,
  };

  return <Component {...props} />;
}

// ---------------------------------------------------------------------------
// Tab navigation for 'tabs' layout
// ---------------------------------------------------------------------------

interface TabBarProps {
  sections: PageSection[];
  activeId: string;
  onSelect: (id: string) => void;
  locale: 'en' | 'ar';
}

function TabBar({ sections, activeId, onSelect, locale }: TabBarProps) {
  const isRtl = locale === 'ar';
  return (
    <div
      className="flex border-b gap-1 overflow-x-auto"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {sections.map((section) => {
        const label = isRtl ? section.title_ar : section.title_en;
        const isActive = section.id === activeId;
        return (
          <Button
            key={section.id}
            variant="ghost"
            size="sm"
            className={`rounded-none border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
            onClick={() => onSelect(section.id)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DynamicPage
// ---------------------------------------------------------------------------

export function DynamicPage({
  config,
  locale,
  values = {},
  onChange,
  onAction,
  errors = {},
  disabled = false,
  backTo,
  actions,
}: DynamicPageProps) {
  const isRtl = locale === 'ar';
  const title = isRtl ? config.title_ar : config.title_en;

  // Tab state (only used for 'tabs' layout)
  const [activeTabId, setActiveTabId] = useState<string>(
    config.sections[0]?.id ?? '',
  );

  const handleChange = (instanceId: string, value: unknown) => {
    onChange?.(instanceId, value);
  };

  const sectionProps = {
    locale,
    values,
    onChange: handleChange,
    onAction,
    errors,
    disabled,
  };

  const renderSections = (sections: PageSection[]) =>
    sections.map((section) => (
      <SectionRenderer key={section.id} section={section} {...sectionProps} />
    ));

  return (
    <PageShell>
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader title={title} backTo={backTo} actions={actions} />

        {config.layout === 'single-column' && (
          <div className="mt-6 space-y-6">{renderSections(config.sections)}</div>
        )}

        {config.layout === 'two-column' && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderSections(config.sections)}
          </div>
        )}

        {config.layout === 'tabs' && (
          <div className="mt-6 space-y-6">
            <TabBar
              sections={config.sections}
              activeId={activeTabId}
              onSelect={setActiveTabId}
              locale={locale}
            />
            {config.sections
              .filter((s) => s.id === activeTabId)
              .map((section) => (
                <SectionRenderer
                  key={section.id}
                  section={section}
                  {...sectionProps}
                />
              ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
