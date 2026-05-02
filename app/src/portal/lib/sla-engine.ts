import type { BaseRecord } from "@refinedev/core";

export type SLAStatus = "on_track" | "at_risk" | "overdue";

export interface SLAResult {
  entityId: string;
  entityName: string;
  entityType: string;
  status: SLAStatus;
  daysSinceActivity: number;
  thresholdDays: number;
  ruleName: string;
}

interface SLARule {
  name: string;
  entityType: string;
  thresholdDays: number;
}

export function evaluateSLA(
  entities: BaseRecord[],
  events: BaseRecord[],
  rules: SLARule[],
  now: Date = new Date(),
): SLAResult[] {
  const results: SLAResult[] = [];

  for (const rule of rules) {
    const matchingEntities = entities.filter((e) => {
      if (rule.entityType === "organization") return true;
      if (rule.entityType === "task") return true;
      if (rule.entityType === "signing-request") return true;
      return false;
    });

    for (const entity of matchingEntities) {
      const entityId = entity.id as string;
      const entityName = (entity.name as string) ?? (entity.title as string) ?? entityId;

      let lastActivityDate: Date;
      if (rule.entityType === "task" && entity.dueDate) {
        const due = new Date(entity.dueDate as string);
        const msPerDay = 86400000;
        const daysUntilDue = Math.floor((due.getTime() - now.getTime()) / msPerDay);
        const threshold = rule.thresholdDays;
        const atRiskThreshold = Math.ceil(threshold * 0.25);

        let status: SLAStatus = "on_track";
        if (daysUntilDue < 0) status = "overdue";
        else if (daysUntilDue <= atRiskThreshold) status = "at_risk";

        results.push({
          entityId,
          entityName,
          entityType: rule.entityType,
          status,
          daysSinceActivity: Math.max(0, -daysUntilDue),
          thresholdDays: threshold,
          ruleName: rule.name,
        });
        continue;
      }

      const entityEvents = events.filter(
        (ev) =>
          (ev.entityId === entityId || ev.organizationId === entityId),
      );

      if (entityEvents.length > 0) {
        const sorted = [...entityEvents].sort(
          (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime(),
        );
        lastActivityDate = new Date(sorted[0].createdAt as string);
      } else {
        lastActivityDate = new Date(entity.createdAt as string);
      }

      const msPerDay = 86400000;
      const daysSince = Math.floor((now.getTime() - lastActivityDate.getTime()) / msPerDay);
      const threshold = rule.thresholdDays;
      const atRiskThreshold = Math.ceil(threshold * 0.75);

      let status: SLAStatus = "on_track";
      if (daysSince >= threshold) status = "overdue";
      else if (daysSince >= atRiskThreshold) status = "at_risk";

      results.push({
        entityId,
        entityName,
        entityType: rule.entityType,
        status,
        daysSinceActivity: daysSince,
        thresholdDays: threshold,
        ruleName: rule.name,
      });
    }
  }

  return results;
}

// ── Engagement Level Score ──

export interface EngagementLevel {
  score: number;        // 0-100
  label: string;        // No activity | Exploring | Developing | Strong | Strategic
  color: string;        // tailwind color class
  activeCount: number;
  completedCount: number;
  totalCount: number;
}

const STAGE_WEIGHTS: Record<string, number> = {
  prospect: 10,
  in_progress: 25,
  negotiating: 50,
  formalized: 75,
  active: 90,
  completed: 100,
  dormant: 0,
};

export function computeEngagementLevel(
  engagements: BaseRecord[],
): EngagementLevel {
  if (engagements.length === 0) {
    return { score: 0, label: "No activity", color: "text-muted-foreground", activeCount: 0, completedCount: 0, totalCount: 0 };
  }

  const completedCount = engagements.filter((e) => e.stage === "completed").length;
  // Active = everything except completed and dormant
  const active = engagements.filter((e) => e.stage !== "completed" && e.stage !== "dormant");
  const activeCount = active.length;
  const totalCount = engagements.length;

  if (activeCount === 0 && completedCount === 0) {
    return { score: 0, label: "No activity", color: "text-muted-foreground", activeCount, completedCount, totalCount };
  }

  // Average stage weight of active engagements only
  let score: number;
  if (activeCount > 0) {
    const sum = active.reduce((acc, e) => acc + (STAGE_WEIGHTS[e.stage as string] ?? 0), 0);
    score = Math.round(sum / activeCount);
  } else {
    // All completed, no active — base score from completed count
    score = Math.min(completedCount * 20, 100);
  }

  let label: string;
  let color: string;
  if (score <= 25) { label = "Exploring"; color = "text-blue-500"; }
  else if (score <= 50) { label = "Developing"; color = "text-amber-500"; }
  else if (score <= 75) { label = "Strong"; color = "text-green-500"; }
  else { label = "Strategic"; color = "text-yellow-500"; }

  return { score, label, color, activeCount, completedCount, totalCount };
}

export function generateAlerts(slaResults: SLAResult[]): Array<{
  type: "overdue" | "at_risk" | "info";
  title: string;
  message: string;
  entityType: string;
  entityId: string;
}> {
  return slaResults
    .filter((r) => r.status !== "on_track")
    .map((r) => ({
      type: r.status === "overdue" ? "overdue" as const : "at_risk" as const,
      title: r.status === "overdue"
        ? `Overdue: ${r.entityName}`
        : `At Risk: ${r.entityName}`,
      message: r.status === "overdue"
        ? `${r.ruleName}: ${r.daysSinceActivity} days since last activity (threshold: ${r.thresholdDays} days)`
        : `${r.ruleName}: approaching deadline for ${r.entityName}`,
      entityType: r.entityType,
      entityId: r.entityId,
    }));
}
