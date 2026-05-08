import { useState, useCallback, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  ShieldCheck,
  Search,
  Check,
  X,
  Clock,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useAuthorization } from "../../engine/hooks";
import { getEntityLayer } from "../../engine/hooks-internal";
import type {
  EngineRole,
  PermissionGrant,
  PermissionRelationship,
  PermissionResourceType,
  PermissionAction,
  AuthorizationResult,
} from "../../engine/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const engineRoles: EngineRole[] = [
  "engine_superadmin",
  "engine_architect",
  "engine_operator",
  "engine_publisher",
  "engine_viewer",
  "engine_analyst",
  "flow_owner",
  "corridor_admin",
];

const permissionRelationships: PermissionRelationship[] = [
  "owns",
  "can_edit",
  "can_configure",
  "can_view",
  "can_publish",
  "can_attach_notifications",
  "delegates_to",
];

const permissionResourceTypes: PermissionResourceType[] = [
  "component_definition",
  "flow_definition",
  "stage_definition",
  "notification_definition",
  "corridor",
  "control_board",
];

const permissionActions: PermissionAction[] = [
  "create",
  "read",
  "update",
  "delete",
  "publish",
  "attach",
  "configure",
];

const subjectTypes = ["user", "role", "team"] as const;

// ---------------------------------------------------------------------------
// Role Management Section
// ---------------------------------------------------------------------------

function RoleManagementSection() {
  const { assignRole, getUserRoles, removeRole } = useAuthorization();

  const [roleAssignments, setRoleAssignments] = useState<
    { userId: string; roles: EngineRole[] }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lookup form
  const [lookupUserId, setLookupUserId] = useState("");

  // Assign form
  const [formUserId, setFormUserId] = useState("");
  const [formRole, setFormRole] = useState<EngineRole>("engine_viewer");

  const handleLookup = useCallback(async () => {
    if (!lookupUserId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const roles = await getUserRoles(lookupUserId.trim());
      setRoleAssignments((prev) => {
        const existing = prev.findIndex((r) => r.userId === lookupUserId.trim());
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { userId: lookupUserId.trim(), roles };
          return next;
        }
        return [...prev, { userId: lookupUserId.trim(), roles }];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch roles.");
    } finally {
      setLoading(false);
    }
  }, [lookupUserId, getUserRoles]);

  const handleAssign = useCallback(async () => {
    if (!formUserId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await assignRole(formUserId.trim(), formRole);
      // Refresh that user's roles
      const roles = await getUserRoles(formUserId.trim());
      setRoleAssignments((prev) => {
        const existing = prev.findIndex((r) => r.userId === formUserId.trim());
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { userId: formUserId.trim(), roles };
          return next;
        }
        return [...prev, { userId: formUserId.trim(), roles }];
      });
      setDialogOpen(false);
      setFormUserId("");
      setFormRole("engine_viewer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign role.");
    } finally {
      setSaving(false);
    }
  }, [formUserId, formRole, assignRole, getUserRoles]);

  const handleRemove = useCallback(
    async (userId: string, role: EngineRole) => {
      setError(null);
      try {
        await removeRole(userId, role);
        const roles = await getUserRoles(userId);
        setRoleAssignments((prev) =>
          prev.map((r) => (r.userId === userId ? { ...r, roles } : r)),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove role.");
      }
    },
    [removeRole, getUserRoles],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Role Management</h3>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Role
        </Button>
      </div>

      {/* Lookup */}
      <div className="flex items-end gap-2">
        <div className="space-y-2">
          <Label htmlFor="role-lookup-user">Lookup User Roles</Label>
          <Input
            id="role-lookup-user"
            placeholder="Enter user ID"
            value={lookupUserId}
            onChange={(e) => setLookupUserId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          />
        </div>
        <Button variant="secondary" onClick={handleLookup} disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          {loading ? "Loading..." : "Lookup"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && roleAssignments.length === 0 ? (
              Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : roleAssignments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-8 text-center text-muted-foreground"
                >
                  No role assignments loaded. Use the lookup above to search by
                  user ID.
                </TableCell>
              </TableRow>
            ) : (
              roleAssignments.map((entry) =>
                entry.roles.length === 0 ? (
                  <TableRow key={entry.userId}>
                    <TableCell className="font-medium">
                      {entry.userId}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      No roles assigned
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ) : (
                  entry.roles.map((role) => (
                    <TableRow key={`${entry.userId}-${role}`}>
                      <TableCell className="font-medium">
                        {entry.userId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{role}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(entry.userId, role)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ),
              )
            )}
          </TableBody>
        </Table>
      </div>

      {/* Assign Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assign-user-id">User ID *</Label>
              <Input
                id="assign-user-id"
                placeholder="e.g. user_abc123"
                value={formUserId}
                onChange={(e) => setFormUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={formRole}
                onValueChange={(v) => setFormRole(v as EngineRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {engineRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAssign} disabled={saving}>
                {saving ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Permission Grants Section
// ---------------------------------------------------------------------------

function PermissionGrantsSection() {
  const { grantPermission, getPermissionsForUser, revokePermission } =
    useAuthorization();

  const [grants, setGrants] = useState<PermissionGrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lookup
  const [lookupUserId, setLookupUserId] = useState("");

  // Grant form
  const [formSubjectType, setFormSubjectType] = useState<
    "user" | "role" | "team"
  >("user");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formPermission, setFormPermission] =
    useState<PermissionRelationship>("can_view");
  const [formResourceType, setFormResourceType] =
    useState<PermissionResourceType>("component_definition");
  const [formResourceId, setFormResourceId] = useState("");
  const [formCorridor, setFormCorridor] = useState("");
  const [formCategory, setFormCategory] = useState("");

  const handleLookup = useCallback(async () => {
    if (!lookupUserId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getPermissionsForUser(lookupUserId.trim());
      setGrants(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch permissions.",
      );
    } finally {
      setLoading(false);
    }
  }, [lookupUserId, getPermissionsForUser]);

  const handleGrant = useCallback(async () => {
    if (!formSubjectId.trim() || !formResourceId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const scope: Record<string, string> = {};
      if (formCorridor.trim()) scope.corridor = formCorridor.trim();
      if (formCategory.trim())
        scope.componentCategory = formCategory.trim();

      await grantPermission({
        subjectType: formSubjectType,
        subjectId: formSubjectId.trim(),
        permission: formPermission,
        resourceType: formResourceType,
        resourceId: formResourceId.trim(),
        scope: Object.keys(scope).length > 0 ? scope : undefined,
        grantedBy: "control_board_admin",
        grantedAt: new Date().toISOString(),
      });

      // Refresh if we have a lookup active
      if (lookupUserId.trim()) {
        const result = await getPermissionsForUser(lookupUserId.trim());
        setGrants(result);
      }

      setDialogOpen(false);
      setFormSubjectId("");
      setFormResourceId("");
      setFormCorridor("");
      setFormCategory("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to grant permission.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    formSubjectType,
    formSubjectId,
    formPermission,
    formResourceType,
    formResourceId,
    formCorridor,
    formCategory,
    lookupUserId,
    grantPermission,
    getPermissionsForUser,
  ]);

  const handleRevoke = useCallback(
    async (grantId: string) => {
      setError(null);
      try {
        await revokePermission(grantId);
        setGrants((prev) => prev.filter((g) => g.id !== grantId));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to revoke permission.",
        );
      }
    },
    [revokePermission],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Permission Grants</h3>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Grant Permission
        </Button>
      </div>

      {/* Lookup */}
      <div className="flex items-end gap-2">
        <div className="space-y-2">
          <Label htmlFor="perm-lookup-user">Lookup User Permissions</Label>
          <Input
            id="perm-lookup-user"
            placeholder="Enter user ID"
            value={lookupUserId}
            onChange={(e) => setLookupUserId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          />
        </div>
        <Button variant="secondary" onClick={handleLookup} disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          {loading ? "Loading..." : "Lookup"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Permission</TableHead>
              <TableHead>Resource Type</TableHead>
              <TableHead>Resource ID</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Granted By</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : grants.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  No permission grants loaded. Use the lookup above to search by
                  user ID.
                </TableCell>
              </TableRow>
            ) : (
              grants.map((grant) => (
                <TableRow key={grant.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {grant.subjectType}
                      </Badge>
                      <span className="font-medium">{grant.subjectId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{grant.permission}</Badge>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {grant.resourceType}
                    </code>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {grant.resourceId}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {grant.scope
                      ? Object.entries(grant.scope)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-xs">{grant.grantedBy}</TableCell>
                  <TableCell className="text-xs">
                    {grant.expiresAt
                      ? new Date(grant.expiresAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(grant.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Grant Permission Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grant Permission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject Type *</Label>
                <Select
                  value={formSubjectType}
                  onValueChange={(v) =>
                    setFormSubjectType(v as "user" | "role" | "team")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        <span className="capitalize">{t}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grant-subject-id">Subject ID *</Label>
                <Input
                  id="grant-subject-id"
                  placeholder="e.g. user_abc123"
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Permission *</Label>
                <Select
                  value={formPermission}
                  onValueChange={(v) =>
                    setFormPermission(v as PermissionRelationship)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionRelationships.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Resource Type *</Label>
                <Select
                  value={formResourceType}
                  onValueChange={(v) =>
                    setFormResourceType(v as PermissionResourceType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionResourceTypes.map((rt) => (
                      <SelectItem key={rt} value={rt}>
                        {rt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grant-resource-id">
                Resource ID * (use * for wildcard)
              </Label>
              <Input
                id="grant-resource-id"
                placeholder="e.g. def_123 or *"
                value={formResourceId}
                onChange={(e) => setFormResourceId(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="grant-corridor">Corridor (optional)</Label>
                <Input
                  id="grant-corridor"
                  placeholder="e.g. ksa-my"
                  value={formCorridor}
                  onChange={(e) => setFormCorridor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grant-category">Category (optional)</Label>
                <Input
                  id="grant-category"
                  placeholder="e.g. field"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleGrant} disabled={saving}>
                {saving ? "Granting..." : "Grant"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Authorization Test Section
// ---------------------------------------------------------------------------

function AuthorizationTestSection() {
  const { authorize } = useAuthorization();

  const [userId, setUserId] = useState("");
  const [action, setAction] = useState<PermissionAction>("read");
  const [resourceType, setResourceType] =
    useState<PermissionResourceType>("component_definition");
  const [resourceId, setResourceId] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<AuthorizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    if (!userId.trim() || !resourceId.trim()) return;
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const res = await authorize({
        userId: userId.trim(),
        action,
        resourceType,
        resourceId: resourceId.trim(),
      });
      setResult(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Authorization check failed.",
      );
    } finally {
      setChecking(false);
    }
  }, [userId, action, resourceType, resourceId, authorize]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Authorization Test</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="auth-test-user">User ID *</Label>
          <Input
            id="auth-test-user"
            placeholder="e.g. user_abc123"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Action *</Label>
          <Select
            value={action}
            onValueChange={(v) => setAction(v as PermissionAction)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {permissionActions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Resource Type *</Label>
          <Select
            value={resourceType}
            onValueChange={(v) =>
              setResourceType(v as PermissionResourceType)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {permissionResourceTypes.map((rt) => (
                <SelectItem key={rt} value={rt}>
                  {rt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="auth-test-resource">Resource ID *</Label>
          <Input
            id="auth-test-resource"
            placeholder="e.g. def_123"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={handleCheck} disabled={checking}>
        <ShieldCheck className="mr-2 h-4 w-4" />
        {checking ? "Checking..." : "Check Authorization"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div
          className={`rounded-md border p-4 ${
            result.allowed
              ? "border-green-500/50 bg-green-500/10"
              : "border-destructive/50 bg-destructive/10"
          }`}
        >
          <div className="flex items-center gap-2">
            <Badge variant={result.allowed ? "default" : "destructive"}>
              {result.allowed ? "ALLOWED" : "DENIED"}
            </Badge>
            {result.reason && (
              <span className="text-sm text-muted-foreground">
                {result.reason}
              </span>
            )}
          </div>
          {result.effectivePermissions &&
            result.effectivePermissions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">
                  Effective permissions:
                </span>
                {result.effectivePermissions.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          <p className="mt-1 text-xs text-muted-foreground">
            Audit ID: {result.auditId}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending Approvals Queue Section (14.9)
// ---------------------------------------------------------------------------

interface PublishRequest {
  id: string;
  resourceName: string;
  resourceType: string;
  resourceId: string;
  description: string;
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
}

function PendingApprovalsSection() {
  const [requests, setRequests] = useState<PublishRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entityLayer = getEntityLayer();
      const result = await entityLayer.listEntities("publish-requests", {
        filters: [
          { field: "status", operator: "eq" as const, value: "pending" },
        ],
      });
      setRequests(
        result.data.map((r) => ({
          id: r.id as string,
          resourceName: (r.resourceName as string) ?? "Unknown",
          resourceType: (r.resourceType as string) ?? "unknown",
          resourceId: (r.resourceId as string) ?? "",
          description: (r.description as string) ?? "",
          requestedBy: (r.requestedBy as string) ?? "unknown",
          requestedAt: (r.requestedAt as string) ?? new Date().toISOString(),
          status: (r.status as PublishRequest["status"]) ?? "pending",
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch publish requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = useCallback(
    async (requestId: string, action: "approved" | "rejected") => {
      setActionInProgress(requestId);
      setError(null);
      try {
        const entityLayer = getEntityLayer();
        await entityLayer.updateEntity("publish-requests", requestId, {
          status: action,
          reviewedAt: new Date().toISOString(),
          reviewedBy: "control_board_admin",
        });
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : `Failed to ${action} request.`,
        );
      } finally {
        setActionInProgress(null);
      }
    },
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Pending Approvals Queue</h3>
          {requests.length > 0 && (
            <Badge variant="secondary">{requests.length}</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  No pending publish requests.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">
                    {req.resourceName}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {req.resourceType}
                    </code>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {req.description}
                  </TableCell>
                  <TableCell className="text-sm">{req.requestedBy}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(req.requestedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-600 hover:bg-green-500/10 hover:text-green-700"
                        disabled={actionInProgress === req.id}
                        onClick={() => handleAction(req.id, "approved")}
                        title="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={actionInProgress === req.id}
                        onClick={() => handleAction(req.id, "rejected")}
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit Trail Viewer Section (14.10)
// ---------------------------------------------------------------------------

interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  allowed: boolean;
  reason: string;
}

function AuditTrailSection() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterUserId, setFilterUserId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entityLayer = getEntityLayer();
      const filters: Array<{ field: string; operator: "eq"; value: unknown }> = [
        { field: "action", operator: "eq" as const, value: "auth_check" },
      ];
      if (filterUserId.trim()) {
        filters.push({
          field: "performedBy",
          operator: "eq" as const,
          value: filterUserId.trim(),
        });
      }

      const result = await entityLayer.listEntities("activity-events", {
        filters,
        sorters: [{ field: "createdAt", order: "desc" as const }],
        pagination: { current: 1, pageSize: 50 },
      });

      let parsed = result.data.map((r) => {
        const details = (r.details ?? {}) as Record<string, unknown>;
        return {
          id: r.id as string,
          timestamp: (r.createdAt as string) ?? (r.performedAt as string) ?? "",
          userId: (r.performedBy as string) ?? "",
          action: (details.requestedAction as string) ?? (r.action as string) ?? "",
          resourceType: (r.entityType as string) ?? "",
          resourceId: (r.entityId as string) ?? "",
          allowed: (details.allowed as boolean) ?? false,
          reason: (details.reason as string) ?? "",
        };
      });

      // Client-side date range filter (in case the entity layer doesn't support range queries)
      if (filterDateFrom) {
        const from = new Date(filterDateFrom).getTime();
        parsed = parsed.filter(
          (e) => e.timestamp && new Date(e.timestamp).getTime() >= from,
        );
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo).getTime() + 86400000; // end of day
        parsed = parsed.filter(
          (e) => e.timestamp && new Date(e.timestamp).getTime() <= to,
        );
      }

      setEvents(parsed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch audit events.",
      );
    } finally {
      setLoading(false);
    }
  }, [filterUserId, filterDateFrom, filterDateTo]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Audit Trail</h3>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="audit-user-filter">User ID</Label>
          <Input
            id="audit-user-filter"
            placeholder="Filter by user ID"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="w-48"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-date-from">From</Label>
          <Input
            id="audit-date-from"
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-date-to">To</Label>
          <Input
            id="audit-date-to"
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={fetchEvents} disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          {loading ? "Loading..." : "Search"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource Type</TableHead>
              <TableHead>Resource ID</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No audit events found. Use the filters above and click Search.
                </TableCell>
              </TableRow>
            ) : (
              events.map((evt) => (
                <TableRow key={evt.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {evt.timestamp
                      ? new Date(evt.timestamp).toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {evt.userId}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {evt.action}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {evt.resourceType}
                    </code>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {evt.resourceId}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={evt.allowed ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {evt.allowed ? "allowed" : "denied"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {evt.reason || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AuthorizationTab
// ---------------------------------------------------------------------------

export function AuthorizationTab() {
  return (
    <div className="space-y-8">
      <PendingApprovalsSection />
      <hr className="border-border" />
      <RoleManagementSection />
      <hr className="border-border" />
      <PermissionGrantsSection />
      <hr className="border-border" />
      <AuthorizationTestSection />
      <hr className="border-border" />
      <AuditTrailSection />
    </div>
  );
}
