/**
 * EngagementFlowForm — engine-driven dynamic form for creating engagements.
 *
 * Fetches component definitions from the engine registry. If definitions
 * exist, renders them dynamically via the engine renderers. If not,
 * shows a prompt to seed the engine first.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreate } from '@refinedev/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedButton } from '../../components/AnimatedButton';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Layers, Send } from 'lucide-react';
import { PageShell } from '../../components/PageShell';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { useComponentRegistry } from '../../engine/hooks';
import { rendererRegistry } from '../../engine/renderer-registry';
import type { ComponentDefinition, DynamicComponentProps } from '../../engine/types';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EngagementFlowForm() {
  const navigate = useNavigate();
  const { mutate: createEngagement, isLoading: isCreating } = useCreate();

  // Fetch all published component definitions
  const { definitions, loading: defsLoading, error: defsError } = useComponentRegistry({
    status: 'published',
  });

  // Form state: keyed by definition slug
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  const setValue = useCallback((slug: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [slug]: value }));
    setErrors((prev) => {
      if (!prev[slug]) return prev;
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }, []);

  // Validate required fields
  const validate = useCallback(
    (defs: ComponentDefinition[]): boolean => {
      const newErrors: Record<string, string[]> = {};
      let valid = true;

      for (const def of defs) {
        const fieldErrors: string[] = [];
        const value = values[def.slug];

        for (const rule of def.validations) {
          if (rule.rule === 'required') {
            if (
              value === undefined ||
              value === null ||
              value === '' ||
              (Array.isArray(value) && value.length === 0)
            ) {
              fieldErrors.push(rule.message_en);
            }
          }
        }

        if (fieldErrors.length > 0) {
          newErrors[def.slug] = fieldErrors;
          valid = false;
        }
      }

      setErrors(newErrors);
      return valid;
    },
    [values],
  );

  const handleSubmit = useCallback(() => {
    if (!validate(definitions)) return;

    // Map slug-keyed values to engagement field names
    const engagementData: Record<string, unknown> = {
      createdBy: 'user-1',
    };

    for (const def of definitions) {
      const val = values[def.slug];
      if (val !== undefined && val !== null && val !== '') {
        engagementData[def.slug] = val;
      }
    }

    // Ensure required defaults
    if (!engagementData.stage) engagementData.stage = 'prospect';
    if (!engagementData.priority) engagementData.priority = 'medium';

    createEngagement(
      {
        resource: 'engagements',
        values: engagementData,
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setTimeout(() => navigate('/portal/engagements'), 1500);
        },
      },
    );
  }, [definitions, values, validate, createEngagement, navigate]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (defsLoading) {
    return (
      <PageShell>
        <PageHeader title="Create Engagement (Dynamic)" backTo="/portal/engagements" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (defsError) {
    return (
      <PageShell>
        <PageHeader title="Create Engagement (Dynamic)" backTo="/portal/engagements" />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">Failed to load engine definitions: {defsError.message}</p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (definitions.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Create Engagement (Dynamic)" backTo="/portal/engagements" />
        <EmptyState
          icon={Layers}
          title="Seed the engine first"
          description="No component definitions are published yet. Go to the Control Board to create and publish component definitions that map to engagement fields."
          action={{
            label: 'Open Control Board',
            onClick: () => navigate('/portal/control-board'),
          }}
        />
      </PageShell>
    );
  }

  if (submitted) {
    return (
      <PageShell>
        <PageHeader title="Create Engagement (Dynamic)" backTo="/portal/engagements" />
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-lg font-medium text-green-600">
              Engagement created successfully!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Redirecting to engagement list...
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Create Engagement (Dynamic)"
          subtitle="Powered by the Dynamic Component Engine"
          backTo="/portal/engagements"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Engagement Fields
              <Badge variant="secondary" className="text-xs">
                {definitions.length} component{definitions.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {definitions.map((def) => {
              const RendererComponent = rendererRegistry.get(def.renderer)
                ?? rendererRegistry.getFallback();

              const props: DynamicComponentProps = {
                instanceId: def.id,
                config: def.defaultConfig,
                validations: def.validations,
                i18n: def.i18n.en,
                value: values[def.slug] ?? '',
                onChange: (val: unknown) => setValue(def.slug, val),
                errors: errors[def.slug],
                disabled: isCreating,
                locale: 'en',
              };

              return (
                <RendererComponent key={def.id} {...props} />
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/portal/engagements')}
          >
            Cancel
          </Button>
          <AnimatedButton
            onClick={handleSubmit}
            loading={isCreating}
          >
            <Send className="mr-2 h-4 w-4" />
            Create Engagement
          </AnimatedButton>
        </div>
      </div>
    </PageShell>
  );
}
