import { useState } from "react";
import { useOne, useDelete } from "@refinedev/core";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabContent } from "../../components/AnimatedTabContent";
import { Badge } from "@/components/ui/badge";
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
import { Pencil, Trash2 } from "lucide-react";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";

export function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const { query: contactQuery } = useOne({ resource: "contacts", id: id! });
  const contact = contactQuery.data?.data;
  const { mutate: deleteContact } = useDelete();

  const { query: orgQuery } = useOne({
    resource: "organizations",
    id: (contact?.organizationId as string) ?? "",
    queryOptions: { enabled: Boolean(contact?.organizationId) },
  });
  const org = orgQuery.data?.data;

  if (contactQuery.isLoading) {
    return <PageShell loading />;
  }

  if (!contact) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Contact not found</p>
        <Button variant="outline" onClick={() => navigate("/portal/contacts")}>
          Back to list
        </Button>
      </div>
    );
  }

  const fullName = `${contact.firstName as string} ${contact.lastName as string}`;

  return (
    <PageShell>
      <PageHeader
        title={fullName}
        backTo="/portal/contacts"
        subtitle={contact.role ? (contact.role as string) : undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/portal/contacts/edit/${id}`)}>
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
                  <AlertDialogTitle>Delete contact?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {fullName}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      deleteContact(
                        { resource: "contacts", id: id! },
                        { onSuccess: () => navigate("/portal/contacts") },
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <AnimatedTabContent activeValue={activeTab} value="overview">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd>{(contact.email as string) || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                  <dd>{(contact.phone as string) || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                  <dd>{(contact.role as string) || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Organization</dt>
                  <dd>
                    {contact.organizationId ? (
                      <Link
                        to={`/portal/organizations/${contact.organizationId}`}
                        className="text-primary hover:underline"
                      >
                        {(org?.name as string) ?? "Loading..."}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </AnimatedTabContent>

        <AnimatedTabContent activeValue={activeTab} value="activity">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Activity timeline coming soon.</p>
            </CardContent>
          </Card>
        </AnimatedTabContent>
      </Tabs>
    </PageShell>
  );
}
