# ADR-004: Flow Engine State Machine

## Status
Proposed

## Context

The dynamic engine orchestrates multi-stage UX flows where:
- Stages can be added/removed/reordered at runtime
- Branch rules determine which stage comes next based on user input
- Active sessions must survive flow restructuring (users mid-flow shouldn't break)
- Sessions can be paused and resumed across devices/sessions

Options:
1. **Finite State Machine (FSM)** — states = stages, transitions = branch rules
2. **Directed Acyclic Graph (DAG)** — nodes = stages, edges = possible transitions with conditions
3. **Sequential list with conditional skip** — ordered stages, each with "skip if" rules
4. **Workflow engine** (external: Temporal, n8n) — delegate orchestration to purpose-built engine

## Decision

**Directed Acyclic Graph (DAG) with priority-ordered edges, stored as Mujarrad relationships.**

Each flow is a DAG where:
- Nodes are stage TEMPLATEs
- Edges are `transitions_to` relationships with conditions and priority
- A default edge (no condition) always exists for linear progression
- Sessions (CONTEXT nodes) track position and collected data

## Design

### Flow Graph Structure

```typescript
interface FlowGraph {
  id: string;                          // TEMPLATE node ID
  entryStageId: string;               // Starting node in the DAG
  stages: Map<string, StageNode>;     // All stages in this flow
  edges: TransitionEdge[];             // All possible transitions
}

interface StageNode {
  id: string;                          // TEMPLATE node ID
  slug: string;
  components: string[];                // Ordered ComponentInstance IDs
  isTerminal: boolean;                 // No outgoing edges = end of flow
  metadata: { label_en: string; label_ar: string; description: string };
}

interface TransitionEdge {
  id: string;
  fromStageId: string;
  toStageId: string;
  conditions: BranchCondition[];       // Empty = default/unconditional
  logic: 'AND' | 'OR';               // How to combine conditions
  priority: number;                    // Lower = evaluated first
}

interface BranchCondition {
  field: string;                       // Dot-path into collected data (e.g., "stage1.sector.primary")
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches' | 'exists';
  value: unknown;
}
```

### Session State (CONTEXT Node)

```typescript
interface FlowSession {
  id: string;                          // CONTEXT node ID
  flowId: string;                      // Which flow (TEMPLATE)
  flowVersion: number;                 // Version of flow at session start
  userId: string;
  currentStageId: string;
  visitedStages: string[];             // History for back-navigation
  collectedData: Record<string, unknown>;  // All data from completed stages
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  createdAt: string;
  updatedAt: string;
}
```

### Stage Transition Algorithm

```typescript
function evaluateNextStage(session: FlowSession, currentStageOutput: Record<string, unknown>): string {
  // 1. Update collected data
  const allData = { ...session.collectedData, [session.currentStageId]: currentStageOutput };

  // 2. Get all outgoing edges from current stage, sorted by priority
  const edges = flow.edges
    .filter(e => e.fromStageId === session.currentStageId)
    .sort((a, b) => a.priority - b.priority);

  // 3. Evaluate edges in priority order — first match wins
  for (const edge of edges) {
    if (edge.conditions.length === 0) continue; // Skip default for now
    if (evaluateConditions(edge.conditions, edge.logic, allData)) {
      return edge.toStageId;
    }
  }

  // 4. Fall through to default edge (unconditional)
  const defaultEdge = edges.find(e => e.conditions.length === 0);
  if (defaultEdge) return defaultEdge.toStageId;

  // 5. No outgoing edges = terminal stage
  throw new FlowTerminalError(session.currentStageId);
}

function evaluateConditions(
  conditions: BranchCondition[],
  logic: 'AND' | 'OR',
  data: Record<string, unknown>
): boolean {
  const results = conditions.map(c => evaluateSingle(c, data));
  return logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
}
```

### Flow Restructuring Safety

When an admin modifies a flow while users are mid-session:

```typescript
// Strategy: Sessions are pinned to the flow version at creation
// New sessions use new structure; existing sessions continue on their version

function handleFlowRestructure(flowId: string, newVersion: number): void {
  // Active sessions continue on their flowVersion (immutable snapshot)
  // Only new sessions (created after this point) use newVersion

  // Exception: if admin explicitly "migrates" active sessions:
  // - Check if current stage still exists in new version
  // - If yes: update session.flowVersion, continue
  // - If no: notify user, offer restart or manual migration
}
```

### Back-Navigation

```typescript
function goBack(session: FlowSession): string {
  if (session.visitedStages.length === 0) throw new FlowStartError();

  const previousStageId = session.visitedStages.pop();
  // Don't discard collected data — user may re-submit with changes
  session.currentStageId = previousStageId;
  return previousStageId;
}
```

### DAG Validation (Control Board)

Before publishing a flow, validate:
1. **Reachability**: All stages are reachable from the entry stage
2. **Acyclicity**: No cycles (prevents infinite loops)
3. **Default path**: Every non-terminal stage has at least one default (unconditional) outgoing edge
4. **Terminal exists**: At least one terminal stage is reachable
5. **Condition validity**: All referenced fields exist in upstream stage component schemas

```typescript
function validateFlowGraph(flow: FlowGraph): ValidationResult {
  const errors: string[] = [];

  // DFS from entry to check reachability
  const reachable = dfs(flow, flow.entryStageId);
  const unreachable = [...flow.stages.keys()].filter(id => !reachable.has(id));
  if (unreachable.length) errors.push(`Unreachable stages: ${unreachable.join(', ')}`);

  // Topological sort to detect cycles
  if (hasCycle(flow)) errors.push('Flow contains cycles');

  // Default edge check
  for (const [stageId, stage] of flow.stages) {
    if (stage.isTerminal) continue;
    const outEdges = flow.edges.filter(e => e.fromStageId === stageId);
    const hasDefault = outEdges.some(e => e.conditions.length === 0);
    if (!hasDefault) errors.push(`Stage ${stageId} has no default transition`);
  }

  return { valid: errors.length === 0, errors };
}
```

## Rationale

### Why DAG over FSM
- FSM requires exhaustive transition enumeration for every state pair — doesn't scale when admin adds stages dynamically
- DAG naturally models "go to next" with optional conditional branches
- DAG is easier to visualize in Control Board (flow chart)

### Why DAG over Sequential + Skip
- Sequential with skip conditions can't model divergent paths (stage 2A vs. 2B)
- Skip logic becomes complex with nested conditions
- DAG explicitly represents the topology; sequential hides it

### Why NOT external workflow engine
- Adds heavy infrastructure dependency (Temporal requires server deployment)
- SIA's flows are relatively simple (5-15 stages, <10 branch points)
- Mujarrad already stores the graph; external engine would duplicate state
- Latency: external engine adds round-trips for every transition

## Consequences

### Positive
- Clear mental model (DAG = visual flow chart)
- Conditional branching is a first-class concept (edges with conditions)
- Sessions pinned to versions = safe restructuring
- Validation before publish prevents broken flows

### Negative
- DAG validation required on every flow save (fast for small graphs, but still compute)
- Session versioning means old flow versions must be queryable (don't delete, archive)
- Back-navigation is simple (pop stack) but conditional forward-navigation after back is complex

### Mitigations
- Cache validated flow graphs; only re-validate on structural change
- Flow version history stored as Mujarrad node versions (built-in)
- On back-then-forward: re-evaluate transitions with current collected data (may route differently)

## Related
- ADR-001: Mujarrad-Native Storage (flows stored as nodes + relationships)
- ADR-003: Real-Time Propagation (flow.restructured events)
- ADR-005: Notification Trigger Architecture (how flow events trigger notifications)
