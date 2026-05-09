/**
 * AdvancedFilterWrapper — adds schema-derived advanced filtering to any list.
 *
 * Fetches component definitions for a resource type, derives filter
 * dimensions from each definition's dataSchema, and renders a collapsible
 * DynamicFilterPanel. On change, the parent receives the current FilterState[].
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DynamicFilterPanel } from './DynamicFilterPanel';
import { useComponentRegistry } from '../hooks';
import { deriveFilterDimensions } from '../schema-adaptive';
import type { FilterDimension, FilterState } from '../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AdvancedFilterWrapperProps {
  /** Resource type to derive filters from (e.g. 'organizations') */
  resourceType: string;
  /** Called whenever the filter state changes */
  onFiltersChange: (filters: FilterState[]) => void;
  /** Display locale */
  locale?: 'en' | 'ar';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdvancedFilterWrapper({
  resourceType,
  onFiltersChange,
  locale = 'en',
}: AdvancedFilterWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState[]>([]);

  // Fetch component definitions scoped to the resource type (category)
  const { definitions, loading } = useComponentRegistry({
    category: resourceType,
  });

  // Derive filter dimensions from all definition schemas
  const dimensions: FilterDimension[] = useMemo(() => {
    const allDimensions: FilterDimension[] = [];
    const seenFields = new Set<string>();

    for (const def of definitions) {
      if (!def.dataSchema) continue;
      const derived = deriveFilterDimensions(def.dataSchema);
      for (const dim of derived) {
        if (!seenFields.has(dim.field)) {
          seenFields.add(dim.field);
          allDimensions.push(dim);
        }
      }
    }

    return allDimensions;
  }, [definitions]);

  const handleChange = useCallback(
    (next: FilterState[]) => {
      setFilters(next);
      onFiltersChange(next);
    },
    [onFiltersChange],
  );

  // Nothing to show if still loading or no dimensions were derived
  if (loading) {
    return (
      <div className="text-xs text-muted-foreground animate-pulse py-2">
        {locale === 'ar' ? 'جاري تحميل الفلاتر...' : 'Loading filters...'}
      </div>
    );
  }

  if (dimensions.length === 0) {
    return null;
  }

  const isRtl = locale === 'ar';
  const activeCount = filters.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {isRtl ? 'فلاتر متقدمة' : 'Advanced Filters'}
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {activeCount}
            </span>
          )}
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="rounded-lg border bg-muted/20 p-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <DynamicFilterPanel
            dimensions={dimensions}
            values={filters}
            onChange={handleChange}
            locale={locale}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
