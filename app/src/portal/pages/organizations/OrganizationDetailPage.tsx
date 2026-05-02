import { useOne, useList, useCreate, useDelete } from "@refinedev/core";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { AnimatedTabContent } from "../../components/AnimatedTabContent";
import { Button } from "@/components/ui/button";
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
  Mail,
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

  const { mutate: createNote } = useCreate();
  const { mutate: deleteFile } = useDelete();
  const { mutate: deleteOrg } = useDelete();
  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [emailOpen, setEmailOpen] = useState(false);

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
                    This will permanently delete {org?.name as string}. This action cannot be undone.
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
          <TabsTrigger value="contacts">
            <Users className="mr-1 h-4 w-4" /> Contacts ({contacts.result?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileText className="mr-1 h-4 w-4" /> Files ({files.result?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="notes">
            <StickyNote className="mr-1 h-4 w-4" /> Notes ({notes.result?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="mr-1 h-4 w-4" /> Activity
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
              </dl>
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* Contacts */}
        <AnimatedTabContent activeValue={activeTab} value="contacts">
          <Card>
            <CardContent className="pt-6">
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
                      <TableRow key={c.id as string}>
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
                      <p className="text-sm">{n.content as string}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(n.createdAt as string).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={StickyNote} title="No notes yet" description="Add a note to keep track of important details." />
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
              ) : (
                <VerticalTimeline
                  events={(events.result?.data ?? []).map((e: BaseRecord) => ({
                    id: e.id as string,
                    title: `${((e.action as string) ?? "").charAt(0).toUpperCase()}${((e.action as string) ?? "").slice(1)} ${e.entityType as string}`,
                    description: e.entityName as string,
                    timestamp: e.createdAt as string,
                    variant: (e.action as string) === "deleted" ? "destructive" as const : "default" as const,
                  } satisfies TimelineEvent))}
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
