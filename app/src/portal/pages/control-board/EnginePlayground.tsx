import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useComponentRegistry, useComponent } from '@/portal/engine/hooks';
import type { DynamicComponentProps } from '@/portal/engine/types';

// ---------------------------------------------------------------------------
// Live Component Preview — renders a definition as an interactive component
// ---------------------------------------------------------------------------

function LiveComponent({ instanceId, locale }: { instanceId: string; locale: 'en' | 'ar' }) {
  const { resolved, loading, error } = useComponent(instanceId, locale);
  const [value, setValue] = useState<unknown>(undefined);

  if (loading) return <Skeleton className="h-20 w-full" />;
  if (error) return <p className="text-sm text-destructive">Error: {error.message}</p>;
  if (!resolved) return <p className="text-sm text-muted-foreground">No component resolved</p>;

  const { Component, config, validations, i18n } = resolved;

  return (
    <Component
      instanceId={instanceId}
      config={config}
      validations={validations}
      i18n={i18n}
      value={value}
      onChange={setValue}
      locale={locale}
    />
  );
}

// ---------------------------------------------------------------------------
// Direct Definition Preview — renders without needing a saved instance
// ---------------------------------------------------------------------------

function DirectPreview({
  definitionId,
  locale,
}: {
  definitionId: string;
  locale: 'en' | 'ar';
}) {
  const { definitions } = useComponentRegistry();
  const [value, setValue] = useState<unknown>(undefined);

  const def = definitions.find((d) => d.id === definitionId);
  if (!def) return <p className="text-sm text-muted-foreground">Definition not found</p>;

  // Dynamically import the renderer registry to resolve the component
  const [Renderer, setRenderer] = useState<React.ComponentType<DynamicComponentProps> | null>(null);

  useEffect(() => {
    import('@/portal/engine/renderer-registry').then(({ rendererRegistry }) => {
      const comp = rendererRegistry.get(def.renderer) ?? rendererRegistry.getFallback();
      setRenderer(() => comp);
    });
  }, [def.renderer]);

  if (!Renderer) return <Skeleton className="h-20 w-full" />;

  const i18n = def.i18n[locale] ?? def.i18n.en;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline">{def.slug}</Badge>
        <Badge>{def.category}</Badge>
        <Badge variant="secondary">{def.renderer}</Badge>
        <Badge variant={def.status === 'published' ? 'default' : 'outline'}>
          {def.status}
        </Badge>
      </div>

      <div className="rounded-lg border-2 border-dashed border-muted p-4">
        <Renderer
          instanceId={`preview-${def.id}`}
          config={def.defaultConfig}
          validations={def.validations}
          i18n={i18n}
          value={value}
          onChange={setValue}
          locale={locale}
        />
      </div>

      {value !== undefined && (
        <div className="rounded bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Current value:</p>
          <pre className="text-xs font-mono">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Engine Playground Page
// ---------------------------------------------------------------------------

export function EnginePlayground() {
  const { definitions, loading } = useComponentRegistry();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locale, setLocale] = useState<'en' | 'ar'>('en');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Engine Playground</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a component definition to see it rendered live. Interact with it — the value updates in real-time.
          </p>

          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Component Definition</label>
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedId ?? ''}
                  onValueChange={(v) => setSelectedId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a definition..." />
                  </SelectTrigger>
                  <SelectContent>
                    {definitions.map((def) => (
                      <SelectItem key={def.id} value={def.id}>
                        {def.slug} — {def.renderer} ({def.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Locale</label>
              <Select value={locale} onValueChange={(v) => setLocale(v as 'en' | 'ar')}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">EN</SelectItem>
                  <SelectItem value="ar">AR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedId && (
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              <DirectPreview definitionId={selectedId} locale={locale} />
            </div>
          </CardContent>
        </Card>
      )}

      {definitions.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No component definitions yet. Create one in the Components tab first.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
