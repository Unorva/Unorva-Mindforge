import { useMemo, useState } from 'react'
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  createColumnHelper,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Settings2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
// 通用表格自身注册所需能力，业务页面只定义列与数据即可。
const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { text: sortFn_text },
})

export type DataTableFeatures = typeof dataTableFeatures

type DataTableProps<TData extends RowData> = {
  centered?: boolean
  columns: ColumnDef<DataTableFeatures, TData, unknown>[]
  data: TData[]
  fillHeight?: boolean
  searchPlaceholder: string
}

const pageSizes = [10, 20, 25, 30, 40, 50]

export function DataTable<TData extends RowData>({
  centered = false,
  columns,
  data,
  fillHeight = true,
  searchPlaceholder,
}: DataTableProps<TData>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  const columnHelper = createColumnHelper<DataTableFeatures, TData>()
  const selectionColumn = useMemo(
    () => columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          aria-label="选择当前页全部记录"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="选择当前记录"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(value === true)}
        />
      ),
      enableHiding: false,
      enableSorting: false,
    }),
    [columnHelper],
  )

  const table = useTable({
    features: dataTableFeatures,
    columns: [selectionColumn, ...columns],
    data,
    state: {
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
      rowSelection,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    globalFilterFn: 'includesString',
  })

  return (
    <div className={fillHeight ? 'flex h-full min-h-0 flex-col gap-4' : 'flex flex-col gap-4'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          className="max-w-sm"
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          placeholder={searchPlaceholder}
          value={globalFilter}
        />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button className="sm:ml-auto" size="sm" variant="outline" />}>
            <Settings2 />视图
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>显示列</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
                <DropdownMenuCheckboxItem
                  checked={column.getIsVisible()}
                  key={column.id}
                  onCheckedChange={(value) => column.toggleVisibility(value === true)}
                >
                  {String(column.columnDef.header ?? column.id)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={fillHeight ? 'min-h-0 flex-1 overflow-auto rounded-md border' : 'overflow-auto rounded-md border'}>
        <Table className={centered ? '[&_th]:text-center [&_td]:text-center' : undefined}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <Button
                        className="-ml-2"
                        onClick={() => header.column.toggleSorting(header.column.getIsSorted() === 'asc')}
                        size="sm"
                        variant="ghost"
                      >
                        <table.FlexRender header={header} />
                        {header.column.getIsSorted() === 'asc' ? <ArrowUp /> : header.column.getIsSorted() === 'desc' ? <ArrowDown /> : <ChevronsUpDown />}
                      </Button>
                    ) : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <TableRow data-state={row.getIsSelected() && 'selected'} key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}><table.FlexRender cell={cell} /></TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={table.getVisibleLeafColumns().length}>暂无匹配记录。</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 px-2 pb-1 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-muted-foreground">
          已选 {table.getFilteredSelectedRowModel().rows.length} / {table.getFilteredRowModel().rows.length} 条
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <span className="text-sm font-medium">每页</span>
          <Select onValueChange={(value) => table.setPageSize(Number(value))} value={String(table.state.pagination.pageSize)}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent side="top">
              {pageSizes.map((pageSize) => <SelectItem key={pageSize} value={String(pageSize)}>{pageSize}</SelectItem>)}
            </SelectContent>
          </Select>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  aria-disabled={!table.getCanPreviousPage()}
                  className={!table.getCanPreviousPage() ? 'pointer-events-none opacity-50' : undefined}
                  href="#"
                  onClick={(event) => { event.preventDefault(); table.setPageIndex(0) }}
                  size="default"
                >首页</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationPrevious
                  aria-disabled={!table.getCanPreviousPage()}
                  className={!table.getCanPreviousPage() ? 'pointer-events-none opacity-50' : undefined}
                  href="#"
                  onClick={(event) => { event.preventDefault(); table.previousPage() }}
                  text="上一页"
                />
              </PaginationItem>
              <PaginationItem><span className="px-2 text-sm font-medium">第 {table.state.pagination.pageIndex + 1} / {table.getPageCount()} 页</span></PaginationItem>
              <PaginationItem>
                <PaginationNext
                  aria-disabled={!table.getCanNextPage()}
                  className={!table.getCanNextPage() ? 'pointer-events-none opacity-50' : undefined}
                  href="#"
                  onClick={(event) => { event.preventDefault(); table.nextPage() }}
                  text="下一页"
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  aria-disabled={!table.getCanNextPage()}
                  className={!table.getCanNextPage() ? 'pointer-events-none opacity-50' : undefined}
                  href="#"
                  onClick={(event) => { event.preventDefault(); table.setPageIndex(table.getPageCount() - 1) }}
                  size="default"
                >末页</PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}
