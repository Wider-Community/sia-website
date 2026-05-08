/**
 * SuggestionReviewPanel — displays pending AI agent suggestions
 * with approve/reject buttons, confidence indicator, and config preview.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { AgentSuggestion, SuggestionType } from '../agentic-suggestions';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SuggestionReviewPanelProps {
  suggestions: AgentSuggestion[];
  loading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  locale: 'en' | 'ar';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<SuggestionType, { en: string; ar: string }> = {
  component: { en: 'Component', ar: 'مكوّن' },
  flow_stage: { en: 'Flow Stage', ar: 'مرحلة التدفق' },
  matching_dimension: { en: 'Match Dimension', ar: 'بُعد المطابقة' },
  notification: { en: 'Notification', ar: 'إشعار' },
};

const TYPE_COLORS: Record<SuggestionType, string> = {
  component: 'bg-blue-500/15 text-blue-700 border-blue-300',
  flow_stage: 'bg-purple-500/15 text-purple-700 border-purple-300',
  matching_dimension: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  notification: 'bg-amber-500/15 text-amber-700 border-amber-300',
};

function ConfidenceIndicator({
  confidence,
  locale,
}: {
  confidence: number;
  locale: 'en' | 'ar';
}) {
  const percentage = Math.round(confidence * 100);
  const barColor =
    confidence >= 0.8
      ? 'bg-emerald-500'
      : confidence >= 0.5
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {locale === 'ar' ? 'الثقة' : 'Confidence'}
      </span>
      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium">{percentage}%</span>
    </div>
  );
}

function ConfigPreview({
  config,
  locale,
}: {
  config: Record<string, unknown>;
  locale: 'en' | 'ar';
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(config);

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        {locale === 'ar' ? 'لا توجد تفاصيل تكوين' : 'No configuration details'}
      </p>
    );
  }

  const displayEntries = expanded ? entries : entries.slice(0, 3);

  return (
    <div className="space-y-1">
      {displayEntries.map(([key, value]) => (
        <div key={key} className="flex items-baseline gap-2 text-xs">
          <span className="font-mono text-muted-foreground">{key}:</span>
          <span className="text-foreground truncate max-w-[200px]">
            {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
          </span>
        </div>
      ))}
      {entries.length > 3 && (
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? (locale === 'ar' ? 'عرض أقل' : 'Show less')
            : (locale === 'ar' ? `+${entries.length - 3} المزيد` : `+${entries.length - 3} more`)}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SuggestionReviewPanel({
  suggestions,
  loading,
  onApprove,
  onReject,
  locale,
}: SuggestionReviewPanelProps) {
  const isRtl = locale === 'ar';
  const pending = suggestions.filter((s) => s.status === 'pending');

  if (loading) {
    return (
      <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
          {isRtl ? 'اقتراحات الوكيل' : 'Agent Suggestions'}
        </h3>
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
          {isRtl ? 'اقتراحات الوكيل' : 'Agent Suggestions'}
        </h3>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {isRtl
                ? 'لا توجد اقتراحات معلقة للمراجعة.'
                : 'No pending suggestions to review.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
          {isRtl ? 'اقتراحات الوكيل' : 'Agent Suggestions'}
        </h3>
        <Badge variant="secondary" className="text-xs">
          {pending.length} {isRtl ? 'معلق' : 'pending'}
        </Badge>
      </div>

      <div className="space-y-3">
        {pending.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            locale={locale}
            onApprove={onApprove}
            onReject={onReject}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single suggestion card
// ---------------------------------------------------------------------------

interface SuggestionCardProps {
  suggestion: AgentSuggestion;
  locale: 'en' | 'ar';
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function SuggestionCard({
  suggestion,
  locale,
  onApprove,
  onReject,
}: SuggestionCardProps) {
  const [actionInProgress, setActionInProgress] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = () => {
    setActionInProgress('approve');
    onApprove(suggestion.id);
  };

  const handleReject = () => {
    setActionInProgress('reject');
    onReject(suggestion.id);
  };

  const typeLabel = TYPE_LABELS[suggestion.type]?.[locale] ?? suggestion.type;
  const typeColor = TYPE_COLORS[suggestion.type] ?? '';

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className={`text-xs shrink-0 ${typeColor}`}>
              {typeLabel}
            </Badge>
            <CardTitle className="text-sm font-medium truncate">
              {suggestion.title}
            </CardTitle>
          </div>
          <ConfidenceIndicator
            confidence={suggestion.confidence}
            locale={locale}
          />
        </div>
        <CardDescription className="text-xs mt-1 line-clamp-2">
          {suggestion.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="py-2">
        <div className="bg-muted/50 rounded-md p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {locale === 'ar' ? 'التكوين المقترح' : 'Suggested Configuration'}
          </p>
          <ConfigPreview config={suggestion.suggestedConfig} locale={locale} />
        </div>
      </CardContent>

      <CardFooter className="pt-2 gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-1">
          <span>
            {locale === 'ar' ? 'بواسطة' : 'By'} {suggestion.suggestedBy}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleReject}
          disabled={actionInProgress !== null}
        >
          {actionInProgress === 'reject'
            ? (locale === 'ar' ? 'جارٍ...' : 'Rejecting...')
            : (locale === 'ar' ? 'رفض' : 'Reject')}
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleApprove}
          disabled={actionInProgress !== null}
        >
          {actionInProgress === 'approve'
            ? (locale === 'ar' ? 'جارٍ...' : 'Approving...')
            : (locale === 'ar' ? 'موافقة' : 'Approve')}
        </Button>
      </CardFooter>
    </Card>
  );
}
