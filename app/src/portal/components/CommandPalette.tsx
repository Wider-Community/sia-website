import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useList } from "@refinedev/core";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Building2,
  Users,
  FileSignature,
  CheckSquare,
  Search,
  Kanban,
  Map as MapIcon,
  Settings,
  LayoutDashboard,
  Layers,
} from "lucide-react";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
}

const pages: SearchResult[] = [
  { id: "nav-dashboard", type: "page", title: "Dashboard", href: "/portal" },
  { id: "nav-orgs", type: "page", title: "Organizations", href: "/portal/organizations" },
  { id: "nav-contacts", type: "page", title: "Contacts", href: "/portal/contacts" },
  { id: "nav-pipeline", type: "page", title: "Pipeline", href: "/portal/pipeline" },
  { id: "nav-map", type: "page", title: "Map", href: "/portal/map" },
  { id: "nav-signing", type: "page", title: "Documents & Signing", href: "/portal/signing" },
  { id: "nav-tasks", type: "page", title: "Tasks", href: "/portal/tasks" },
  { id: "nav-settings", type: "page", title: "Settings", href: "/portal/settings/sla" },
  { id: "nav-new-org", type: "page", title: "New Organization", href: "/portal/organizations/create" },
  { id: "nav-new-contact", type: "page", title: "New Contact", href: "/portal/contacts/create" },
  { id: "nav-new-task", type: "page", title: "New Task", href: "/portal/tasks/create" },
  { id: "nav-new-signing", type: "page", title: "New Signing Request", href: "/portal/signing/new" },
  { id: "nav-engagements", type: "page", title: "Engagements", href: "/portal/engagements" },
  { id: "nav-new-engagement", type: "page", title: "New Engagement", href: "/portal/engagements/create" },
];

const pageIcons: Record<string, typeof Building2> = {
  Dashboard: LayoutDashboard,
  Organizations: Building2,
  Contacts: Users,
  Pipeline: Kanban,
  Map: MapIcon,
  "Documents & Signing": FileSignature,
  Tasks: CheckSquare,
  Settings: Settings,
  Engagements: Layers,
};

export function CommandPalette() {
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const orgs = useList({ resource: "organizations", pagination: { mode: "off" } });
  const contacts = useList({ resource: "contacts", pagination: { mode: "off" } });
  const tasks = useList({ resource: "tasks", pagination: { mode: "off" } });
  const engagements = useList({ resource: "engagements", pagination: { mode: "off" } });
  const signingRequests = useList({ resource: "signing-requests", pagination: { mode: "off" } });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const allResults = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];
    for (const org of orgs.result?.data ?? []) {
      results.push({
        id: org.id as string,
        type: "organization",
        title: org.name as string,
        subtitle: `${(org.type as string) ?? ""} · ${((org as Record<string, unknown>).locations as Array<{ city: string; countryName: string; isDefault: boolean }> | undefined)?.find((l) => l.isDefault)?.countryName ?? ""}`,
        href: `/portal/organizations/${org.id}`,
      });
    }
    for (const c of contacts.result?.data ?? []) {
      results.push({
        id: c.id as string,
        type: "contact",
        title: `${c.firstName as string} ${c.lastName as string}`,
        subtitle: (c.email as string) ?? (c.role as string) ?? "",
        href: `/portal/contacts/${c.id}`,
      });
    }
    for (const t of tasks.result?.data ?? []) {
      results.push({
        id: t.id as string,
        type: "task",
        title: t.title as string,
        subtitle: `${(t.priority as string) ?? ""} · ${(t.status as string) ?? ""}`,
        href: "/portal/tasks",
      });
    }
    for (const e of engagements.result?.data ?? []) {
      results.push({
        id: e.id as string,
        type: "engagement",
        title: e.title as string,
        subtitle: `${(e.stage as string) ?? ""} · ${(e.category as string) ?? ""}`,
        href: `/portal/engagements/${e.id}`,
      });
    }
    for (const s of signingRequests.result?.data ?? []) {
      results.push({
        id: s.id as string,
        type: "signing",
        title: s.title as string,
        subtitle: (s.status as string) ?? "",
        href: `/portal/signing/${s.id}`,
      });
    }
    return results;
  }, [orgs.result?.data, contacts.result?.data, tasks.result?.data, engagements.result?.data, signingRequests.result?.data]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { pages: pages.slice(0, 6), organizations: [], contacts: [], tasks: [], engagements: [], signing: [] };
    const matchPages = pages.filter((p) => p.title.toLowerCase().includes(q));
    const matchOrgs = allResults.filter((r) => r.type === "organization" && r.title.toLowerCase().includes(q)).slice(0, 5);
    const matchContacts = allResults.filter((r) => r.type === "contact" && r.title.toLowerCase().includes(q)).slice(0, 5);
    const matchTasks = allResults.filter((r) => r.type === "task" && r.title.toLowerCase().includes(q)).slice(0, 5);
    const matchEngagements = allResults.filter((r) => r.type === "engagement" && r.title.toLowerCase().includes(q)).slice(0, 5);
    const matchSigning = allResults.filter((r) => r.type === "signing" && r.title.toLowerCase().includes(q)).slice(0, 5);
    return { pages: matchPages, organizations: matchOrgs, contacts: matchContacts, tasks: matchTasks, engagements: matchEngagements, signing: matchSigning };
  }, [query, allResults]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery("");
      navigate(result.href);
    },
    [navigate],
  );

  const totalResults = filtered.pages.length + filtered.organizations.length + filtered.contacts.length + filtered.tasks.length + filtered.engagements.length + filtered.signing.length;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search organizations, contacts, tasks, engagements, signing..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim() && totalResults === 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        {!query.trim() && (
          <CommandGroup heading="Quick Navigation">
            {filtered.pages.map((p) => {
              const Icon = pageIcons[p.title] ?? Search;
              return (
                <CommandItem key={p.id} onSelect={() => handleSelect(p)}>
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{p.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {filtered.pages.length > 0 && query.trim() && (
          <CommandGroup heading="Pages">
            {filtered.pages.map((p) => {
              const Icon = pageIcons[p.title] ?? Search;
              return (
                <CommandItem key={p.id} onSelect={() => handleSelect(p)}>
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{p.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {filtered.organizations.length > 0 && (
          <CommandGroup heading="Organizations">
            {filtered.organizations.map((r) => (
              <CommandItem key={r.id} onSelect={() => handleSelect(r)}>
                <Building2 className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{r.title}</span>
                  {r.subtitle && <span className="text-xs text-muted-foreground">{r.subtitle}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filtered.contacts.length > 0 && (
          <CommandGroup heading="Contacts">
            {filtered.contacts.map((r) => (
              <CommandItem key={r.id} onSelect={() => handleSelect(r)}>
                <Users className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{r.title}</span>
                  {r.subtitle && <span className="text-xs text-muted-foreground">{r.subtitle}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filtered.tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {filtered.tasks.map((r) => (
              <CommandItem key={r.id} onSelect={() => handleSelect(r)}>
                <CheckSquare className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{r.title}</span>
                  {r.subtitle && <span className="text-xs text-muted-foreground">{r.subtitle}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filtered.engagements.length > 0 && (
          <CommandGroup heading="Engagements">
            {filtered.engagements.map((r) => (
              <CommandItem key={r.id} onSelect={() => handleSelect(r)}>
                <Layers className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{r.title}</span>
                  {r.subtitle && <span className="text-xs text-muted-foreground">{r.subtitle}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filtered.signing.length > 0 && (
          <CommandGroup heading="Signing Requests">
            {filtered.signing.map((r) => (
              <CommandItem key={r.id} onSelect={() => handleSelect(r)}>
                <FileSignature className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{r.title}</span>
                  {r.subtitle && <span className="text-xs text-muted-foreground">{r.subtitle}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
