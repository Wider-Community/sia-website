import { useTable } from "@refinedev/react-table";
import {
  type ColumnDef,
  flexRender,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getCoreRowModel,
} from "@tanstack/react-table";
import { useMemo, useState, useCallback } from "react";
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
import { Plus, ArrowUpDown, ChevronLeft, ChevronRight, Building2, SlidersHorizontal, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Organization } from "../../schemas";
import { PageShell } from "../../components/PageShell";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { DynamicFilterPanel } from "../../engine/components/DynamicFilterPanel";
import { deriveFilterDimensions } from "../../engine/schema-adaptive";
import type { FilterState, JSONSchema7 } from "../../engine/types";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  prospect: "secondary",
  inactive: "outline",
};

const orgSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    type: { type: 'string', title: 'Type', enum: ['partner', 'investor', 'vendor', 'client', 'market_entity'] },
    status: { type: 'string', title: 'Status', enum: ['active', 'inactive', 'prospect'] },
  },
};

const orgFilterDimensions = deriveFilterDimensions(orgSchema);

export function OrganizationListPage() {
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState[]>([]);

  const columns = useMemo<ColumnDef<Organization>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            Name <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ getValue }) => (
          <span className="capitalize">{getValue<string>()}</span>
        ),
        filterFn: "equals",
      },
      {
        id: "location",
        header: "Location",
        cell: ({ row }) => {
          const locations = (row.original as any).locations as Array<{ city: string; countryName: string; isDefault: boolean }> | undefined;
          const defaultLoc = locations?.find((l) => l.isDefault) ?? locations?.[0];
          if (!defaultLoc) return "—";
          return `${defaultLoc.city}, ${defaultLoc.countryName}`;
        },
      },
      {
        id: "source",
        header: "Source",
        cell: ({ row }) => {
          const sources = (row.original as any).data_sources as string[] | undefined;
          if (!sources?.length) return <Badge variant="outline" className="text-xs">Manual</Badge>;
          const labelMap: Record<string, string> = {
            google_maps: "Google Maps", clutch: "Clutch", firecrawl: "Website",
            leadmagic: "LeadMagic", failory: "Failory", seedtable: "Seedtable",
          };
          return (
            <div className="flex flex-wrap gap-1">
              {sources.slice(0, 2).map((s: string) => (
                <Badge key={s} variant="secondary" className="text-xs">{labelMap[s] ?? s}</Badge>
              ))}
              {sources.length > 2 && (
                <Badge variant="secondary" className="text-xs">+{sources.length - 2}</Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<string>();
          return <Badge variant={statusVariant[status] ?? "outline"}>{status}</Badge>;
        },
        filterFn: "equals",
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            Updated <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
      },
    ],
    [],
  );

  const { reactTable, refineCore } = useTable<Organization>({
    columns,
    refineCoreProps: {
      resource: "organizations",
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

  // Apply advanced filter state to table columns
  const handleAdvancedFiltersChange = useCallback(
    (filters: FilterState[]) => {
      setAdvancedFilters(filters);
      // Map advanced filters to table column filters
      for (const dim of orgFilterDimensions) {
        const match = filters.find((f) => f.field === dim.field);
        const col = reactTable.getColumn(dim.field);
        if (col) {
          col.setFilterValue(match && match.value !== "" ? match.value : undefined);
        }
      }
    },
    [reactTable],
  );

  const isLoading = refineCore.tableQuery.isLoading;

  return (
    <PageShell>
      <PageHeader
        title="Organizations"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/portal/organizations/dynamic-create")}>
              <Zap className="mr-2 h-4 w-4" />
              Create (Dynamic)
            </Button>
            <AnimatedButton onClick={() => navigate("/portal/organizations/create")}>
              <Plus className="mr-2 h-4 w-4" />
              New Organization
            </AnimatedButton>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={showAdvancedFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAdvancedFilters((prev) => !prev)}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Advanced Filters
          {advancedFilters.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-xs font-medium text-primary">
              {advancedFilters.length}
            </span>
          )}
        </Button>
      </div>

      {showAdvancedFilters && (
        <div className="rounded-md border p-4">
          <DynamicFilterPanel
            dimensions={orgFilterDimensions}
            values={advancedFilters}
            onChange={handleAdvancedFiltersChange}
            locale="en"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search organizations..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={(reactTable.getColumn("type")?.getFilterValue() as string) ?? "all"}
          onValueChange={(v) =>
            reactTable.getColumn("type")?.setFilterValue(v === "all" ? undefined : v)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
            <SelectItem value="investor">Investor</SelectItem>
            <SelectItem value="vendor">Vendor</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="market_entity">Market Entity</SelectItem>
          </SelectContent>
        </Select>
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
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
                    onClick={() => navigate(`/portal/organizations/${row.original.id}`)}
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
                    icon={Building2}
                    title="No organizations yet"
                    description="Create your first organization to get started."
                    action={{ label: "Create first organization", onClick: () => navigate("/portal/organizations/create") }}
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
          {reactTable.getFilteredRowModel().rows.length} organization(s)
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
