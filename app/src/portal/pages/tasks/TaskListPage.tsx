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
import { Plus, ArrowUpDown, ChevronLeft, ChevronRight, CheckSquare, LayoutGrid, Trash2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { useUpdate, useDelete } from "@refinedev/core";
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
import type { Task } from "../../schemas";

const priorityColor: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

export function TaskListPage() {
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState("");
  const { mutate: updateTask } = useUpdate();
  const { mutate: deleteTask } = useDelete();

  const columns = useMemo<ColumnDef<Task>[]>(
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
        accessorKey: "organizationName",
        header: "Organization",
        cell: ({ row }) => {
          const orgId = row.original.organizationId;
          const orgName = row.original.organizationName;
          if (!orgId) return "—";
          return (
            <Link
              to={`/portal/organizations/${orgId}`}
              className="text-primary underline-offset-4 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {orgName || "Unknown"}
            </Link>
          );
        },
      },
      {
        accessorKey: "engagementName",
        header: "Engagement",
        cell: ({ row }) => {
          const engId = row.original.engagementId;
          const engName = row.original.engagementName;
          if (!engId) return "—";
          return (
            <Link
              to={`/portal/engagements/${engId}`}
              className="text-primary underline-offset-4 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {engName || "Unknown"}
            </Link>
          );
        },
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            Due Date <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const s = getValue<string>();
          return <Badge variant={s === "done" ? "secondary" : "default"}>{s}</Badge>;
        },
        filterFn: "equals",
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ getValue }) => {
          const p = getValue<string>();
          return <Badge variant={priorityColor[p] ?? "outline"}>{p}</Badge>;
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const task = row.original;
          const isDone = task.status === "done";
          return (
            <div className="flex items-center gap-1">
              <AnimatedButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  updateTask({
                    resource: "tasks",
                    id: task.id,
                    values: { status: isDone ? "open" : "done" },
                  });
                }}
              >
                {isDone ? "Reopen" : "Mark Done"}
              </AnimatedButton>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete task?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &ldquo;{task.title}&rdquo;. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        deleteTask({ resource: "tasks", id: task.id })
                      }
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
      },
    ],
    [updateTask, deleteTask],
  );

  const { reactTable, refineCore } = useTable<Task>({
    columns,
    refineCoreProps: {
      resource: "tasks",
      pagination: { mode: "client", pageSize: 10 },
      sorters: { initial: [{ field: "dueDate", order: "asc" }] },
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
        title="Tasks"
        actions={
          <>
            <AnimatedButton variant="outline" onClick={() => navigate("/portal/tasks/board")}>
              <LayoutGrid className="mr-2 h-4 w-4" />
              Board View
            </AnimatedButton>
            <AnimatedButton onClick={() => navigate("/portal/tasks/create")}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </AnimatedButton>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search tasks..."
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
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                    className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/portal/tasks/${row.original.id}`)}
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
                    icon={CheckSquare}
                    title="No tasks yet"
                    description="Create your first task to track work."
                    action={{ label: "Create first task", onClick: () => navigate("/portal/tasks/create") }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reactTable.getFilteredRowModel().rows.length} task(s)
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
