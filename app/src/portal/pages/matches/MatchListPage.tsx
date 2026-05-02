import { useTable } from "@refinedev/react-table";
import {
  type ColumnDef,
  flexRender,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getCoreRowModel,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "../../components/AnimatedButton";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowUpDown, ChevronLeft, ChevronRight, Link2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MATCH_CATEGORIES, MATCH_STATUSES, type Match } from "../../schemas";
import { PageShell } from "../../components/PageShell";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import type { BaseRecord } from "@refinedev/core";

const statusBadgeConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  pending: { variant: "outline", className: "border-amber-500 text-amber-600" },
  accepted_a: { variant: "secondary", className: "bg-blue-100 text-blue-700" },
  accepted_b: { variant: "secondary", className: "bg-blue-100 text-blue-700" },
  mutual: { variant: "default", className: "bg-green-600" },
  declined: { variant: "destructive" },
  expired: { variant: "outline", className: "text-muted-foreground" },
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MatchListPage() {
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState("");

  // Fetch organizations for name lookup
  const orgs = useList({ resource: "organizations", pagination: { mode: "off" } });
  const orgMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const org of (orgs.result?.data ?? []) as BaseRecord[]) {
      map[org.id as string] = org.name as string;
    }
    return map;
  }, [orgs.result?.data]);

  const columns = useMemo<ColumnDef<Match>[]>(
    () => [
      {
        accessorKey: "organizationAId",
        header: "Organization A",
        cell: ({ getValue }) => {
          const id = getValue<string>();
          const name = orgMap[id] ?? "Unknown";
          return (
            <Link
              to={`/portal/organizations/${id}`}
              className="text-primary underline-offset-4 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>
          );
        },
      },
      {
        accessorKey: "organizationBId",
        header: "Organization B",
        cell: ({ getValue }) => {
          const id = getValue<string>();
          const name = orgMap[id] ?? "Unknown";
          return (
            <Link
              to={`/portal/organizations/${id}`}
              className="text-primary underline-offset-4 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>
          );
        },
      },
      {
        accessorKey: "matchScore",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            Score <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const score = getValue<number>();
          return (
            <div className="flex items-center gap-2">
              <div className="h-2 w-16 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground">{score}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => (
          <Badge variant="secondary" className="capitalize">
            {formatLabel(getValue<string>())}
          </Badge>
        ),
        filterFn: "equals",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<string>();
          const config = statusBadgeConfig[status] ?? { variant: "outline" as const };
          return (
            <Badge variant={config.variant} className={config.className}>
              {formatLabel(status)}
            </Badge>
          );
        },
        filterFn: "equals",
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            Created <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const val = getValue<string>();
          return val ? new Date(val).toLocaleDateString() : "—";
        },
      },
    ],
    [orgMap],
  );

  const { reactTable, refineCore } = useTable<Match>({
    columns,
    refineCoreProps: {
      resource: "matches",
      pagination: { mode: "client", pageSize: 10 },
      sorters: { initial: [{ field: "createdAt", order: "desc" }] },
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
  });

  const isLoading = refineCore.tableQuery.isLoading;

  return (
    <PageShell>
      <PageHeader
        title="Matches"
        actions={
          <AnimatedButton onClick={() => navigate("/portal/matches/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Match
          </AnimatedButton>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search matches..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={(reactTable.getColumn("status")?.getFilterValue() as string) ?? "all"}
          onValueChange={(v) =>
            reactTable.getColumn("status")?.setFilterValue(v === "all" ? undefined : v)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {MATCH_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {formatLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={(reactTable.getColumn("category")?.getFilterValue() as string) ?? "all"}
          onValueChange={(v) =>
            reactTable.getColumn("category")?.setFilterValue(v === "all" ? undefined : v)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {MATCH_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {formatLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {reactTable.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : reactTable.getRowModel().rows.length ? (
              <AnimatePresence>
                {reactTable.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                    onClick={() => navigate(`/portal/matches/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyState
                    icon={Link2}
                    title="No matches yet"
                    description="Create your first match to connect organizations with mutual opportunities."
                    action={{ label: "Create first match", onClick: () => navigate("/portal/matches/create") }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reactTable.getFilteredRowModel().rows.length} match(es)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => reactTable.previousPage()}
            disabled={!reactTable.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {reactTable.getState().pagination.pageIndex + 1} of{" "}
            {reactTable.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reactTable.nextPage()}
            disabled={!reactTable.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
