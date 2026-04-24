import { useOne, useList, useCreate, useDelete } from "@refinedev/core";
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import type { BaseRecord } from "@refinedev/core";
import { FileUploader } from "../../components/FileUploader";

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
  const [noteText, setNoteText] = useState("");

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    createNote({
      resource: "notes",
      values: { content: noteText, createdBy: "user-1", organizationId: id },
    });
    setNoteText("");
  };

  if (orgQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/portal/organizations")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {org.name as string}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{org.type as string}</span>
              <Badge variant={statusVariant[(org.status as string) ?? ""] ?? "outline"}>
                {org.status as string}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate(`/portal/organizations/edit/${id}`)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
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
        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Country</dt>
                  <dd className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {(org.country as string) || "—"}</dd>
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
        </TabsContent>

        {/* Contacts */}
        <TabsContent value="contacts">
          <Card>
            <CardContent className="pt-6">
              {contacts.query.isLoading ? (
                <Skeleton className="h-32 w-full" />
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
                <p className="text-sm text-muted-foreground">No contacts yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files */}
        <TabsContent value="files">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <FileUploader organizationId={id!} onUploadComplete={() => files.query.refetch()} />
              {files.query.isLoading ? (
                <Skeleton className="h-32 w-full" />
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
                            <Button variant="ghost" size="icon" title="Download">
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
                <p className="text-sm text-muted-foreground">No files yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
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
                <Button onClick={handleAddNote} disabled={!noteText.trim()} className="self-end">
                  <Send className="mr-2 h-4 w-4" /> Add
                </Button>
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
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-6">
              {events.query.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (events.result?.data?.length ?? 0) > 0 ? (
                <div className="space-y-3">
                  {events.result!.data.map((e: BaseRecord) => (
                    <div key={e.id as string} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                      <Activity className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium capitalize">{e.action as string}</span>
                      <span className="text-muted-foreground">{e.entityType as string}</span>
                      <span className="truncate">{e.entityName as string}</span>
                      <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(e.createdAt as string).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
