/**
 * Notification Attachment Matrix
 *
 * Visual matrix showing which notifications are attached to which flow
 * events/stages. Rows = notifications, Columns = stages/events.
 * Cells show checkmarks where attached.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import type { NotificationDefinition, NotificationTriggerType } from "../../engine/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_TRIGGER_TYPES: NotificationTriggerType[] = [
  "flow.started",
  "flow.completed",
  "stage.entered",
  "stage.submitted",
  "component.value_changed",
  "branch.selected",
  "match.discovered",
  "data.threshold_breached",
  "schedule",
];

/** Short display labels for column headers */
const triggerLabel: Record<NotificationTriggerType, string> = {
  "flow.started": "Flow Start",
  "flow.completed": "Flow End",
  "stage.entered": "Stage Enter",
  "stage.submitted": "Stage Submit",
  "component.value_changed": "Value Change",
  "branch.selected": "Branch",
  "match.discovered": "Match",
  "data.threshold_breached": "Threshold",
  schedule: "Schedule",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NotificationAttachmentMatrixProps {
  definitions: NotificationDefinition[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationAttachmentMatrix({
  definitions,
}: NotificationAttachmentMatrixProps) {
  if (definitions.length === 0) return null;

  // Collect unique stage IDs referenced across all definitions
  const stageIds = Array.from(
    new Set(
      definitions
        .map((d) => d.trigger.source.stageId)
        .filter((s): s is string => !!s),
    ),
  );

  // Collect unique flow IDs referenced across all definitions
  const flowIds = Array.from(
    new Set(
      definitions
        .map((d) => d.trigger.source.flowId)
        .filter((f): f is string => !!f),
    ),
  );

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">Attachment Matrix</h3>
        <p className="text-xs text-muted-foreground">
          Shows which notifications are attached to which trigger events
          {stageIds.length > 0 && " and stages"}.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px] sticky left-0 bg-background">
                Notification
              </TableHead>
              {ALL_TRIGGER_TYPES.map((t) => (
                <TableHead
                  key={t}
                  className="min-w-[90px] text-center text-xs"
                >
                  {triggerLabel[t]}
                </TableHead>
              ))}
              {stageIds.map((sid) => (
                <TableHead
                  key={`stage-${sid}`}
                  className="min-w-[90px] text-center text-xs"
                >
                  <span className="block truncate max-w-[100px]" title={sid}>
                    {sid}
                  </span>
                </TableHead>
              ))}
              {flowIds.map((fid) => (
                <TableHead
                  key={`flow-${fid}`}
                  className="min-w-[90px] text-center text-xs"
                >
                  <span className="block truncate max-w-[100px]" title={fid}>
                    {fid}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {definitions.map((def) => (
              <TableRow key={def.id}>
                <TableCell className="sticky left-0 bg-background font-medium">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[140px]">{def.slug}</span>
                    {!def.enabled && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        off
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Trigger type columns */}
                {ALL_TRIGGER_TYPES.map((t) => (
                  <TableCell key={t} className="text-center">
                    {def.trigger.eventType === t ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                    ) : null}
                  </TableCell>
                ))}

                {/* Stage columns */}
                {stageIds.map((sid) => (
                  <TableCell key={`stage-${sid}`} className="text-center">
                    {def.trigger.source.stageId === sid ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-blue-500" />
                    ) : null}
                  </TableCell>
                ))}

                {/* Flow columns */}
                {flowIds.map((fid) => (
                  <TableCell key={`flow-${fid}`} className="text-center">
                    {def.trigger.source.flowId === fid ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-violet-500" />
                    ) : null}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span>Trigger event match</span>
        </div>
        {stageIds.length > 0 && (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-blue-500" />
            <span>Stage attachment</span>
          </div>
        )}
        {flowIds.length > 0 && (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-violet-500" />
            <span>Flow attachment</span>
          </div>
        )}
      </div>
    </div>
  );
}
