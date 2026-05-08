/**
 * BranchSelector — renders branch choices when a stage has multiple
 * outgoing conditional transitions.
 *
 * Shows one card per conditional transition so the user can manually
 * select their path. If every transition can be auto-evaluated by
 * the flow engine this component is unnecessary.
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TransitionEdge, BranchCondition, BranchOperator } from '../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BranchSelectorProps {
  transitions: TransitionEdge[];
  stageLabels: Record<string, string>; // stageId -> label
  onSelect: (targetStageId: string) => void;
  locale: 'en' | 'ar';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OPERATOR_LABELS: Record<BranchOperator, { en: string; ar: string }> = {
  eq: { en: 'equals', ar: '\u064A\u0633\u0627\u0648\u064A' },
  neq: { en: 'not equal to', ar: '\u0644\u0627 \u064A\u0633\u0627\u0648\u064A' },
  in: { en: 'is one of', ar: '\u0648\u0627\u062D\u062F \u0645\u0646' },
  nin: { en: 'is not one of', ar: '\u0644\u064A\u0633 \u0648\u0627\u062D\u062F \u0645\u0646' },
  gt: { en: 'greater than', ar: '\u0623\u0643\u0628\u0631 \u0645\u0646' },
  lt: { en: 'less than', ar: '\u0623\u0635\u063A\u0631 \u0645\u0646' },
  gte: { en: 'at least', ar: '\u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644' },
  lte: { en: 'at most', ar: '\u0639\u0644\u0649 \u0627\u0644\u0623\u0643\u062B\u0631' },
  contains: { en: 'contains', ar: '\u064A\u062D\u062A\u0648\u064A' },
  matches: { en: 'matches', ar: '\u064A\u0637\u0627\u0628\u0642' },
  exists: { en: 'exists', ar: '\u0645\u0648\u062C\u0648\u062F' },
};

function describeCondition(condition: BranchCondition, locale: 'en' | 'ar'): string {
  const op = OPERATOR_LABELS[condition.operator]?.[locale] ?? condition.operator;
  const value =
    condition.operator === 'exists'
      ? ''
      : ` ${Array.isArray(condition.value) ? condition.value.join(', ') : String(condition.value ?? '')}`;
  return `${condition.field} ${op}${value}`;
}

function describeTransition(transition: TransitionEdge, locale: 'en' | 'ar'): string {
  if (transition.conditions.length === 0) {
    return locale === 'ar' ? '\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A' : 'Default path';
  }
  const joiner = transition.logic === 'AND'
    ? (locale === 'ar' ? ' \u0648 ' : ' AND ')
    : (locale === 'ar' ? ' \u0623\u0648 ' : ' OR ');
  return transition.conditions.map((c) => describeCondition(c, locale)).join(joiner);
}

/** True when a transition has no conditions (acts as the fallback/default). */
function isDefault(t: TransitionEdge): boolean {
  return t.conditions.length === 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BranchSelector({
  transitions,
  stageLabels,
  onSelect,
  locale,
}: BranchSelectorProps) {
  const isRtl = locale === 'ar';

  // Separate conditional transitions from the default fallback
  const conditionalTransitions = transitions
    .filter((t) => !isDefault(t))
    .sort((a, b) => a.priority - b.priority);

  const defaultTransition = transitions.find(isDefault);

  if (conditionalTransitions.length === 0 && defaultTransition) {
    // Only a default path -- nothing to choose
    return null;
  }

  return (
    <div className="w-full space-y-3" dir={isRtl ? 'rtl' : 'ltr'}>
      <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
        {isRtl ? '\u0627\u062E\u062A\u0631 \u0627\u0644\u0645\u0633\u0627\u0631' : 'Choose your path'}
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {conditionalTransitions.map((transition) => {
          const label = stageLabels[transition.toStageId] ?? transition.toStageId;
          const description = describeTransition(transition, locale);

          return (
            <Card
              key={transition.id}
              className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/40"
              onClick={() => onSelect(transition.toStageId)}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-base font-medium group-hover:text-primary transition-colors">
                  {label}
                </CardTitle>
                <CardDescription className="text-xs mt-1 line-clamp-2">
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {defaultTransition && (
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onSelect(defaultTransition.toStageId)}
          >
            {isRtl ? '\u0645\u062A\u0627\u0628\u0639\u0629 \u0628\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A' : 'Continue with default path'}
            {' \u2192 '}
            {stageLabels[defaultTransition.toStageId] ?? defaultTransition.toStageId}
          </Button>
        </div>
      )}
    </div>
  );
}
