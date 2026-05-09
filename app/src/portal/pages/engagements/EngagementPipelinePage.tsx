/**
 * EngagementPipelinePage — Kanban pipeline view for engagements.
 *
 * Columns represent engagement stages (from ENGAGEMENT_STAGES).
 * Cards are engagement records grouped by their `stage` field.
 */

import { useMemo } from 'react';
import { useList } from '@refinedev/core';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Handshake } from 'lucide-react';
import { PageShell } from '../../components/PageShell';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { ENGAGEMENT_STAGES, type Engagement } from '../../schemas';

// ---------------------------------------------------------------------------
// Stage display config
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  in_progress: 'In Progress',
  negotiating: 'Negotiating',
  formalized: 'Formalized',
  active: 'Active',
  completed: 'Completed',
  dormant: 'Dormant',
};

const STAGE_COLORS: string[] = [
  '#6366f1', // indigo  — prospect
  '#0ea5e9', // sky     — in_progress
  '#f59e0b', // amber   — negotiating
  '#8b5cf6', // violet  — formalized
  '#22c55e', // green   — active
  '#14b8a6', // teal    — completed
  '#94a3b8', // slate   — dormant
];

const CATEGORY_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  deal: 'default',
  project: 'secondary',
  opportunity: 'outline',
  initiative: 'secondary',
  regulatory: 'outline',
  diplomatic: 'outline',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Engagement Card
// ---------------------------------------------------------------------------

function EngagementCard({
  engagement,
  onClick,
}: {
  engagement: Engagement & { organizationName?: string };
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/40"
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-medium truncate">
          {engagement.title}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground truncate">
          {engagement.organizationName ?? engagement.organizationId}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-1 flex items-center gap-2 flex-wrap">
        <Badge
          variant={CATEGORY_VARIANT[engagement.category] ?? 'outline'}
          className="text-[10px] capitalize"
        >
          {engagement.category.replace(/_/g, ' ')}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {formatDate(engagement.createdAt)}
        </span>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton for columns
// ---------------------------------------------------------------------------

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="min-w-[260px] w-[260px] shrink-0 space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export function EngagementPipelinePage() {
  const navigate = useNavigate();

  const listResult = useList<Engagement>({
    resource: 'engagements',
    pagination: { mode: 'off' },
    sorters: [{ field: 'updatedAt', order: 'desc' }],
  });

  const isLoading = listResult.query?.isLoading ?? false;
  const engagements = (listResult.result?.data ?? []) as (Engagement & { organizationName?: string })[];

  // Group engagements by stage
  const engagementsByStage = useMemo(() => {
    const map: Record<string, (Engagement & { organizationName?: string })[]> = {};
    for (const stage of ENGAGEMENT_STAGES) {
      map[stage] = [];
    }
    for (const eng of engagements) {
      const stage = eng.stage;
      if (map[stage]) {
        map[stage].push(eng);
      }
    }
    return map;
  }, [engagements]);

  const totalCount = engagements.length;

  return (
    <PageShell>
      <PageHeader
        title="Engagement Pipeline"
        subtitle={`${totalCount} engagement${totalCount !== 1 ? 's' : ''} across ${ENGAGEMENT_STAGES.length} stages`}
        backTo="/portal/engagements"
      />

      {isLoading ? (
        <KanbanSkeleton />
      ) : totalCount === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No engagements yet"
          description="Create your first engagement to see it in the pipeline view."
          action={{
            label: 'Create Engagement',
            onClick: () => navigate('/portal/engagements/create'),
          }}
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ENGAGEMENT_STAGES.map((stage, idx) => {
            const stageEngagements = engagementsByStage[stage] ?? [];
            const color = STAGE_COLORS[idx % STAGE_COLORS.length];

            return (
              <div
                key={stage}
                className="flex flex-col min-w-[260px] w-[260px] shrink-0 rounded-lg border bg-muted/30"
              >
                {/* Column header */}
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-t-lg"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-sm font-semibold text-white truncate">
                    {STAGE_LABELS[stage] ?? stage}
                  </span>
                  <span className="text-xs font-medium text-white/80 bg-white/20 rounded-full px-2 py-0.5">
                    {stageEngagements.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 p-2 min-h-[120px] overflow-y-auto max-h-[calc(100vh-240px)]">
                  {stageEngagements.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No engagements
                    </p>
                  )}
                  {stageEngagements.map((eng) => (
                    <EngagementCard
                      key={eng.id}
                      engagement={eng}
                      onClick={() => navigate(`/portal/engagements/${eng.id}`)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
