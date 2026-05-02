import { useOne, useList, useCreate, useDelete, useUpdate, useCustom } from "@refinedev/core";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { AnimatedTabContent } from "../../components/AnimatedTabContent";
import { Button } from "@/components/ui/button";
import { computeEngagementLevel } from "../../lib/sla-engine";
import { AnimatedButton } from "../../components/AnimatedButton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "../../components/EmptyState";
import { TableSkeleton } from "../../components/TableSkeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Globe,
  MapPin,
  Send,
  FileText,
  Activity,
  Users,
  StickyNote,
  Download,
  Plus,
  Layers,
  Mail,
  Link2,
  ArrowRight,
  CheckSquare,
} from "lucide-react";
import type { BaseRecord } from "@refinedev/core";
import { FileUploader } from "../../components/FileUploader";
import { VerticalTimeline, type TimelineEvent } from "../../components/VerticalTimeline";
import { EmailComposeModal } from "../../components/EmailComposeModal";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";

export function OrganizationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { query: orgQuery } = useOne({ resource: "organizations", id: id! });
  const org = orgQuery.data?.data;

  const contacts = useList({ resource: "contacts", filters: [{ field: "organizationId", operator: "eq", value: id }], pagination: { mode: "off" } });
  const files = useList({ resource: "files", filters: [{ field: "organizationId", operator: "eq", value: id }], pagination: { mode: "off" } });
  const notes = useList({ resource: "notes", filters: [{ field: "organizationId", operator: "eq", value: id }], sorters: [{ field: "createdAt", order: "desc" }], pagination: { mode: "off" } });
  const events = useList({ resource: "activity-events", filters: [{ field: "organizationId", operator: "eq", value: id }], sorters: [{ field: "createdAt", order: "desc" }], pagination: { mode: "off" } });
  const engagements = useList({ resource: "engagements", filters: [{ field: "organizationId", operator: "eq", value: id }], pagination: { mode: "off" } });
  const tasks = useList({ resource: "tasks", filters: [{ field: "organizationId", operator: "eq", value: id }], pagination: { mode: "off" } });
  const allMatches = useList({ resource: "matches", pagination: { mode: "off" } });
  const allOrgs = useList({ resource: "organizations", pagination: { mode: "off" } });
  const engLevel = computeEngagementLevel(engagements.result?.data ?? []);

  // Filter matches involving this org (client-side OR logic)
  const orgMatches = useMemo(() => {
    const data = allMatches.result?.data ?? [];
    return data.filter((m: BaseRecord) => m.organizationAId === id || m.organizationBId === id);
  }, [allMatches.result?.data, id]);

  // Org name lookup map
  const orgMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of (allOrgs.result?.data ?? [])) {
      map.set(o.id as string, o.name as string);
    }
    return map;
  }, [allOrgs.result?.data]);

  const { data: attributesData, isLoading: attributesLoading } = useCustom({
    url: `/api/nodes/${id}/attributes`,
    method: "get",
  });

  // Also fetch incoming attributes (where this org is the target)
  // For now, the outgoing attributes from the node are sufficient

  const relationships = (attributesData?.data as any[])?.filter(
    (attr: any) => attr.attributeName !== "belongs_to" && attr.attributeName !== "relates_to"
  ) ?? [];

  const { mutate: createNote } = useCreate();
  const { mutate: updateNote } = useUpdate();
  const { mutate: deleteNote } = useDelete();
  const { mutate: deleteFile } = useDelete();
  const { mutate: deleteOrg } = useDelete();
  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [emailOpen, setEmailOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  const primaryContact = contacts.result?.data?.[0];
  const primaryEmail = (primaryContact?.email as string) ?? "";

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    createNote({
      resource: "notes",
      values: { content: noteText, createdBy: "user-1", organizationId: id },
    });
    setNoteText("");
  };

  if (orgQuery.isLoading) {
    return <PageShell loading={true}>{null}</PageShell>;
  }

  if (!org) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Organization not found</p>
        <Button variant="outline" onClick={() => navigate("/portal/organizations")}>
          Back to list
        </Button>
      </div>
    );
  }

  const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
    active: "default",
    prospect: "secondary",
    inactive: "outline",
  };

  return (
    <PageShell loading={orgQuery.isLoading}>
      <PageHeader
        title={org?.name as string ?? ""}
        backTo="/portal/organizations"
        subtitle={`${(org?.type as string) ?? ""} · ${(org?.status as string) ?? ""}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEmailOpen(true)}>
              <Mail className="mr-2 h-4 w-4" /> Email
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/portal/tasks/create?organizationId=${id}&organizationName=${encodeURIComponent(org?.name as string ?? "")}`}>
                <Plus className="mr-2 h-4 w-4" /> New Task
              </Link>
            </Button>
            <Button variant="outline" onClick={() => navigate(`/portal/organizations/edit/${id}`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete organization?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {(() => {
                      const contactCount = contacts.result?.data?.length ?? 0;
                      const engCount = engagements.result?.data?.length ?? 0;
                      const taskCount = tasks.result?.data?.length ?? 0;
                      const fileCount = files.result?.data?.length ?? 0;
                      const hasRelated = contactCount + engCount + taskCount + fileCount > 0;
                      if (hasRelated) {
                        const parts: string[] = [];
                        if (contactCount > 0) parts.push(`${contactCount} contact${contactCount !== 1 ? "s" : ""}`);
                        if (engCount > 0) parts.push(`${engCount} engagement${engCount !== 1 ? "s" : ""}`);
                        if (taskCount > 0) parts.push(`${taskCount} task${taskCount !== 1 ? "s" : ""}`);
                        if (fileCount > 0) parts.push(`${fileCount} file${fileCount !== 1 ? "s" : ""}`);
                        return `This organization has ${parts.join(", ")}. Deleting it will remove all related data. This action cannot be undone.`;
                      }
                      return `This will permanently delete ${org?.name as string}. This action cannot be undone.`;
                    })()}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      deleteOrg(
                        { resource: "organizations", id: id! },
                        { onSuccess: () => navigate("/portal/organizations") },
                      )
                    }
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagements">
            <Layers className="mr-1 h-4 w-4" /> Engagements ({engagements.result?.total ?? 0})
            {engLevel.score > 0 && (
              <Badge variant="outline" className={`ml-1.5 text-[10px] ${engLevel.color}`}>{engLevel.label}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <Users className="mr-1 h-4 w-4" /> Contacts ({contacts.result?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileText className="mr-1 h-4 w-4" /> Files ({files.result?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="notes">
            <StickyNote className="mr-1 h-4 w-4" /> Notes ({notes.result?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckSquare className="mr-1 h-4 w-4" /> Tasks ({tasks.result?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="matches">
            <Link2 className="mr-1 h-4 w-4" /> Matches ({orgMatches.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="mr-1 h-4 w-4" /> Activity
          </TabsTrigger>
          <TabsTrigger value="relationships">
            <Link2 className="mr-1 h-4 w-4" /> Relationships ({relationships.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <AnimatedTabContent activeValue={activeTab} value="overview">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Locations</dt>
                  <dd>
                    {((org as any).locations as Array<{ city: string; countryName: string; isDefault: boolean }> | undefined)?.length ? (
                      <ul className="space-y-1">
                        {((org as any).locations as Array<{ city: string; countryName: string; isDefault: boolean }>).map((loc, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {loc.city}, {loc.countryName}
                            {loc.isDefault && <Badge variant="outline" className="ml-1 text-xs">Default</Badge>}
                          </li>
                        ))}
                      </ul>
                    ) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Website</dt>
                  <dd>
                    {org.website ? (
                      <a href={org.website as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <Globe className="h-3 w-3" /> {org.website as string}
                      </a>
                    ) : "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Description</dt>
                  <dd>{(org.description as string) || "—"}</dd>
                </div>
                {(org.tags as string[])?.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Tags</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {(org.tags as string[]).map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </dd>
                  </div>
                )}

                {/* Market Intelligence Data — only shown when present */}
                {(org as any).team_size && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Team Size</dt>
                    <dd>{(org as any).team_size}</dd>
                  </div>
                )}

                {(org as any).founded_year && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Founded</dt>
                    <dd>{(org as any).founded_year}</dd>
                  </div>
                )}

                {(org as any).hourly_rate && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Hourly Rate</dt>
                    <dd>{(org as any).hourly_rate}</dd>
                  </div>
                )}

                {(org as any).google_rating != null && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Google Rating</dt>
                    <dd>{(org as any).google_rating} ({(org as any).google_reviews_count ?? 0} reviews)</dd>
                  </div>
                )}

                {(org as any).linkedin_url && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">LinkedIn</dt>
                    <dd>
                      <a href={(org as any).linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">
                        {(org as any).linkedin_url}
                      </a>
                    </dd>
                  </div>
                )}

                {(org as any).services?.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Services</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {((org as any).services as string[]).map((s: string) => (
                        <Badge key={s} variant="outline">{s}</Badge>
                      ))}
                    </dd>
                  </div>
                )}

                {(org as any).industries_served?.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Industries Served</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {((org as any).industries_served as string[]).map((ind: string) => (
                        <Badge key={ind} variant="secondary">{ind}</Badge>
                      ))}
                    </dd>
                  </div>
                )}

                {(org as any).tech_stack?.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Tech Stack</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {((org as any).tech_stack as string[]).map((t: string) => (
                        <Badge key={t} className="font-mono text-xs">{t}</Badge>
                      ))}
                    </dd>
                  </div>
                )}

              </dl>
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* Engagements */}
        <AnimatedTabContent activeValue={activeTab} value="engagements">
          <Card>
            <CardContent className="pt-6">
              {/* Engagement Level Badge */}
              {engLevel.totalCount > 0 && (
                <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50">
                  <div className={`text-2xl font-bold ${engLevel.color}`}>{engLevel.score}%</div>
                  <div>
                    <div className={`font-medium ${engLevel.color}`}>{engLevel.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {engLevel.activeCount} active, {engLevel.completedCount} completed
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/portal/engagements/create?organizationId=${id}&organizationName=${encodeURIComponent(org?.name as string ?? "")}`}>
                    <Plus className="mr-2 h-4 w-4" /> New Engagement
                  </Link>
                </Button>
              </div>
              {engagements.query.isLoading ? (
                <TableSkeleton rows={3} columns={4} />
              ) : (engagements.result?.data?.length ?? 0) > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {engagements.result!.data.map((e: BaseRecord) => {
                      const stageCfg: Record<string, string> = { prospect: "outline", in_progress: "secondary", negotiating: "secondary", formalized: "default", active: "default", completed: "outline", dormant: "outline" };
                      return (
                        <TableRow key={e.id as string} className="cursor-pointer" onClick={() => navigate(`/portal/engagements/${e.id}`)}>
                          <TableCell className="font-medium">{e.title as string}</TableCell>
                          <TableCell><Badge variant={(stageCfg[e.stage as string] ?? "outline") as "default" | "secondary" | "outline" | "destructive"}>{(e.stage as string)?.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell><Badge variant="secondary" className="capitalize">{(e.category as string)?.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell><Badge variant={(e.priority as string) === "high" || (e.priority as string) === "critical" ? "destructive" : "outline"}>{e.priority as string}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{e.targetDate ? new Date(e.targetDate as string).toLocaleDateString() : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={Layers} title="No engagements yet" description="Create an engagement to track deals, projects, and initiatives with this organization." />
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* Contacts */}
        <AnimatedTabContent activeValue={activeTab} value="contacts">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/portal/contacts/create?organizationId=${id}&organizationName=${encodeURIComponent(org?.name as string ?? "")}`}>
                    <Plus className="mr-2 h-4 w-4" /> Add Contact
                  </Link>
                </Button>
              </div>
              {contacts.query.isLoading ? (
                <TableSkeleton rows={3} columns={4} />
              ) : (contacts.result?.data?.length ?? 0) > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.result!.data.map((c: BaseRecord) => (
                      <TableRow key={c.id as string} className="cursor-pointer" onClick={() => navigate(`/portal/contacts/${c.id}`)}>
                        <TableCell className="font-medium">{c.firstName as string} {c.lastName as string}</TableCell>
                        <TableCell>{(c.email as string) || "—"}</TableCell>
                        <TableCell>{(c.phone as string) || "—"}</TableCell>
                        <TableCell>{(c.role as string) || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={Users} title="No contacts yet" description="Add a contact to this organization." />
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* Files */}
        <AnimatedTabContent activeValue={activeTab} value="files">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <FileUploader organizationId={id!} onUploadComplete={() => files.query.refetch()} />
              {files.query.isLoading ? (
                <TableSkeleton rows={3} columns={5} />
              ) : (files.result?.data?.length ?? 0) > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.result!.data.map((f: BaseRecord) => (
                      <TableRow key={f.id as string}>
                        <TableCell className="font-medium">{f.name as string}</TableCell>
                        <TableCell>{((f.mimeType as string) ?? "").split("/").pop()}</TableCell>
                        <TableCell>{formatBytes(f.size as number)}</TableCell>
                        <TableCell>{new Date(f.createdAt as string).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Download"
                              onClick={() => {
                                const key = f.r2ObjectKey as string;
                                if (key) {
                                  const url = `/api/download?key=${encodeURIComponent(key)}`;
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = f.name as string;
                                  a.click();
                                }
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Delete">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete file?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete {f.name as string}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteFile({ resource: "files", id: f.id as string })}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={FileText} title="No files yet" description="Upload a file to this organization." />
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* Notes */}
        <AnimatedTabContent activeValue={activeTab} value="notes">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <AnimatedButton onClick={handleAddNote} disabled={!noteText.trim()} className="self-end">
                  <Send className="mr-2 h-4 w-4" /> Add
                </AnimatedButton>
              </div>
              {notes.query.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (notes.result?.data?.length ?? 0) > 0 ? (
                <div className="space-y-3">
                  {notes.result!.data.map((n: BaseRecord) => (
                    <div key={n.id as string} className="rounded-md border p-3">
                      {editingNoteId === (n.id as string) ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                updateNote({
                                  resource: "notes",
                                  id: n.id as string,
                                  values: { content: editingNoteText },
                                });
                                setEditingNoteId(null);
                              }}
                              disabled={!editingNoteText.trim()}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingNoteId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm">{n.content as string}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(n.createdAt as string).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Edit note"
                              onClick={() => {
                                setEditingNoteId(n.id as string);
                                setEditingNoteText(n.content as string);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Delete note"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete note?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this note. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      deleteNote({ resource: "notes", id: n.id as string })
                                    }
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={StickyNote} title="No notes yet" description="Add a note to keep track of important details." />
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* Tasks */}
        <AnimatedTabContent activeValue={activeTab} value="tasks">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/portal/tasks/create?organizationId=${id}&organizationName=${encodeURIComponent(org?.name as string ?? "")}`}>
                    <Plus className="mr-2 h-4 w-4" /> New Task
                  </Link>
                </Button>
              </div>
              {tasks.query.isLoading ? (
                <TableSkeleton rows={3} columns={4} />
              ) : (tasks.result?.data?.length ?? 0) > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.result!.data.map((t: BaseRecord) => (
                      <TableRow key={t.id as string} className="cursor-pointer" onClick={() => navigate(`/portal/tasks/${t.id}`)}>
                        <TableCell className="font-medium">{t.title as string}</TableCell>
                        <TableCell><Badge variant={(t.status as string) === "done" ? "secondary" : "default"}>{t.status as string}</Badge></TableCell>
                        <TableCell><Badge variant={(t.priority as string) === "high" ? "destructive" : "outline"}>{t.priority as string}</Badge></TableCell>
                        <TableCell>{t.dueDate ? new Date(t.dueDate as string).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={CheckSquare} title="No tasks yet" description="Create a task to track work for this organization." />
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* Matches */}
        <AnimatedTabContent activeValue={activeTab} value="matches">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/portal/matches/create?organizationAId=${id}&organizationAName=${encodeURIComponent(org?.name as string ?? "")}`}>
                    <Plus className="mr-2 h-4 w-4" /> Create Match
                  </Link>
                </Button>
              </div>
              {allMatches.query.isLoading ? (
                <TableSkeleton rows={3} columns={5} />
              ) : orgMatches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Other Organization</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgMatches.map((m: BaseRecord) => {
                      const isA = m.organizationAId === id;
                      const otherId = isA ? (m.organizationBId as string) : (m.organizationAId as string);
                      const otherName = orgMap.get(otherId) ?? (isA ? (m.organizationBName as string) : (m.organizationAName as string)) ?? "Unknown";
                      const status = m.status as string;
                      const statusColor: Record<string, string> = {
                        pending: "bg-yellow-500 hover:bg-yellow-600 text-white",
                        accepted_a: "bg-blue-500 hover:bg-blue-600 text-white",
                        accepted_b: "bg-blue-500 hover:bg-blue-600 text-white",
                        mutual: "bg-green-500 hover:bg-green-600 text-white",
                        declined: "bg-red-500 hover:bg-red-600 text-white",
                        expired: "bg-gray-500 hover:bg-gray-600 text-white",
                      };
                      const reason = (m.reason as string) ?? "";
                      return (
                        <TableRow key={m.id as string}>
                          <TableCell>
                            <Button
                              variant="link"
                              className="h-auto p-0"
                              onClick={() => navigate(`/portal/organizations/${otherId}`)}
                            >
                              {otherName} <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${m.score as number}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{m.score as number}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground truncate block max-w-[200px]" title={reason}>
                              {reason.length > 60 ? `${reason.slice(0, 60)}...` : reason || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {(m.category as string)?.replace(/_/g, " ") ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColor[status] ?? ""}>
                              {status?.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={Link2}
                  title="No matches yet"
                  description="Create a match to connect this organization with another."
                  action={{ label: "Create Match", onClick: () => navigate(`/portal/matches/create?organizationAId=${id}&organizationAName=${encodeURIComponent(org?.name as string ?? "")}`) }}
                />
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* Activity */}
        <AnimatedTabContent activeValue={activeTab} value="activity">
          <Card>
            <CardContent className="pt-6">
              {events.query.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (events.result?.data?.length ?? 0) > 0 ? (
                <VerticalTimeline
                  events={(events.result?.data ?? []).map((e: BaseRecord) => ({
                    id: e.id as string,
                    title: `${((e.action as string) ?? "").charAt(0).toUpperCase()}${((e.action as string) ?? "").slice(1)} ${e.entityType as string}`,
                    description: (e.entityName as string) || orgMap.get(e.entityId as string) || "Unknown",
                    timestamp: e.createdAt as string,
                    variant: (e.action as string) === "deleted" ? "destructive" as const : "default" as const,
                  } satisfies TimelineEvent))}
                />
              ) : (
                <EmptyState icon={Activity} title="No activity yet" description="Activity will appear here as you interact with this organization." />
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* Relationships */}
        <AnimatedTabContent activeValue={activeTab} value="relationships">
          <Card>
            <CardContent className="pt-6">
              {attributesLoading ? (
                <TableSkeleton rows={3} columns={4} />
              ) : relationships.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Connected Organization</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Signals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relationships.map((rel: any) => {
                      const meta = rel.attributeValue ?? {};
                      const confidence = meta.confidence ?? null;
                      const signals = meta.signals ?? [];
                      const targetId = rel.targetNodeId;
                      const verb = (rel.attributeName ?? "").replace(/_/g, " ");

                      return (
                        <TableRow key={rel.id}>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{verb}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="link"
                              className="h-auto p-0"
                              onClick={() => navigate(`/portal/organizations/${targetId}`)}
                            >
                              {orgMap.get(targetId) || "Unknown"} <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            {confidence != null ? (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${Math.round(confidence * 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(confidence * 100)}%
                                </span>
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            {signals.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {signals.map((s: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                                ))}
                              </div>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={Link2}
                  title="No relationships yet"
                  description="Relationships will appear here when the intelligence engine discovers connections to other organizations."
                />
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>
      </Tabs>

      <EmailComposeModal
        open={emailOpen}
        onOpenChange={setEmailOpen}
        defaultTo={primaryEmail}
        organizationId={id}
        organizationName={org?.name as string ?? ""}
      />
    </PageShell>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
