import { useList, useDelete } from "@refinedev/core";
import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "../../components/AnimatedButton";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "../../components/EmptyState";
import type { BaseRecord } from "@refinedev/core";

export function ContactListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { mutate: deleteContact } = useDelete();

  const { result: contactsResult, query: contactsQuery } = useList({
    resource: "contacts",
    pagination: { mode: "off" },
  });
  const contactsData = contactsResult;
  const isLoading = contactsQuery.isLoading;

  const { result: orgsResult } = useList({
    resource: "organizations",
    pagination: { mode: "off" },
  });
  const orgsData = orgsResult;

  const orgMap = useMemo(() => {
    const map = new Map<string, string>();
    orgsData?.data?.forEach((org) => {
      map.set(org.id as string, org.name as string);
    });
    return map;
  }, [orgsData]);

  const filtered = useMemo(() => {
    const contacts = contactsData?.data ?? [];
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter((c) => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      const email = ((c.email as string) ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [contactsData, search]);

  return (
    <PageShell>
      <PageHeader
        title="Contacts"
        actions={
          <AnimatedButton onClick={() => navigate("/portal/contacts/create")}>
            <Plus className="mr-2 h-4 w-4" />
            New Contact
          </AnimatedButton>
        }
      />

      <Input
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length > 0 ? (
                <AnimatePresence>
                  {filtered.map((c: BaseRecord, index: number) => (
                    <motion.tr
                      key={c.id as string}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                      onClick={() => navigate(`/portal/contacts/${c.id}`)}
                    >
                      <TableCell className="font-medium">
                        {c.firstName as string} {c.lastName as string}
                      </TableCell>
                      <TableCell>{(c.email as string) || "—"}</TableCell>
                      <TableCell>{(c.phone as string) || "—"}</TableCell>
                      <TableCell>
                        {c.role ? <Badge variant="secondary">{c.role as string}</Badge> : "—"}
                      </TableCell>
                      <TableCell>
                        {c.organizationId ? (
                          <Link
                            to={`/portal/organizations/${c.organizationId}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {orgMap.get(c.organizationId as string) ?? (c.organizationId as string)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete ${c.firstName} ${c.lastName}?`)) {
                              deleteContact({ resource: "contacts", id: c.id as string });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              ) : (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={Users}
                      title="No contacts yet"
                      description="Add your first contact to get started."
                      action={{ label: "New Contact", onClick: () => navigate("/portal/contacts/create") }}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
