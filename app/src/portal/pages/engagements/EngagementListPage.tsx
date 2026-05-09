import { useDelete } from "@refinedev/core";
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
import { Plus, ArrowUpDown, ChevronLeft, ChevronRight, Handshake, Trash2, Kanban, Sparkles } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ENGAGEMENT_STAGES, ENGAGEMENT_CATEGORIES, type Engagement } from "../../schemas";
import { PageShell } from "../../components/PageShell";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";

const stageVariant: Record<string, "default" | "secondary" | "outline"> = {
  prospect: "outline",
  in_progress: "secondary",
  negotiating: "secondary",
  formalized: "default",
  active: "default",
  completed: "outline",
  dormant: "outline",
};

const priorityVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  critical: "destructive",
};

function formatStage(stage: string) {
  return stage.replace(/_/g, " ");
}

export function EngagementListPage() {
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { mutate: deleteEngagement } = useDelete();

  const columns = useMemo<ColumnDef<Engagement>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            Title <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "organizationId",
        header: "Organization",
        cell: ({ row }) => {
          const org = row.original as any;
          const name = org.organizationName ?? org.organizationId;
          return (
            <Link
              to={`/portal/organizations/${row.original.organizationId}`}
              className="text-primary underline-offset-4 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>
          );
        },
      },
      {
        accessorKey: "stage",
        header: "Stage",
        cell: ({ getValue }) => {
          const stage = getValue<string>();
          return (
            <Badge variant={stageVariant[stage] ?? "outline"} className="capitalize">
              {formatStage(stage)}
            </Badge>
          );
        },
        filterFn: "equals",
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => (
          <Badge variant="secondary" className="capitalize">
            {getValue<string>()}
          </Badge>
        ),
        filterFn: "equals",
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ getValue }) => {
          const priority = getValue<string>();
          return (
            <Badge variant={priorityVariant[priority] ?? "outline"} className="capitalize">
              {priority}
            </Badge>
          );
        },
        filterFn: "equals",
      },
      {
        accessorKey: "targetDate",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            Target Date <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const val = getValue<string>();
          return val ? new Date(val).toLocaleDateString() : "—";
        },
      },
      {
        id: "actions",
        header: "",
        size: 60,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setPendingDeleteId(row.original.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ),
      },
    ],
    [],
  );

  const { reactTable, refineCore } = useTable<Engagement>({
    columns,
    refineCoreProps: {
      resource: "engagements",
      pagination: { mode: "client", pageSize: 10 },
      sorters: { initial: [{ field: "updatedAt", order: "desc" }] },
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
        title="Engagements"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/portal/engagements/pipeline")}>
              <Kanban className="mr-2 h-4 w-4" />
              Pipeline View
            </Button>
            <Button variant="outline" onClick={() => navigate("/portal/engagements/dynamic-create")}>
              <Sparkles className="mr-2 h-4 w-4" />
              Create (Dynamic)
            </Button>
            <AnimatedButton onClick={() => navigate("/portal/engagements/create")}>
              <Plus className="mr-2 h-4 w-4" />
              New Engagement
            </AnimatedButton>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search engagements..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={(reactTable.getColumn("stage")?.getFilterValue() as string) ?? "all"}
          onValueChange={(v) =>
            reactTable.getColumn("stage")?.setFilterValue(v === "all" ? undefined : v)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {ENGAGEMENT_STAGES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {formatStage(s)}
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
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {ENGAGEMENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={(reactTable.getColumn("priority")?.getFilterValue() as string) ?? "all"}
          onValueChange={(v) =>
            reactTable.getColumn("priority")?.setFilterValue(v === "all" ? undefined : v)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
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
                    onClick={() => navigate(`/portal/engagements/${row.original.id}`)}
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
                    icon={Handshake}
                    title="No engagements yet"
                    description="Create your first engagement to start tracking deals and opportunities."
                    action={{ label: "Create first engagement", onClick: () => navigate("/portal/engagements/create") }}
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
          {reactTable.getFilteredRowModel().rows.length} engagement(s)
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

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete engagement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this engagement. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId) {
                  deleteEngagement({ resource: "engagements", id: pendingDeleteId });
                }
                setPendingDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
