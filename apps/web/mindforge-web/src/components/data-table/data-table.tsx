import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search, Settings2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { AnimatedTableBody, AnimatedTableRow, AnimatedTableWrapper } from '@/components/animated-components/animated-table'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type DataTableProps<TData extends RowData> = {
  centered?: boolean
  // 同一张业务表会同时包含字符串、日期、枚举和操作列；v8 需以宽泛值类型承接异构列。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[]
  data: TData[]
  fillHeight?: boolean
  searchPlaceholder: string
}

const pageSizes = [10, 20, 25, 30, 40, 50]

export function DataTable<TData extends RowData>({ centered = false, columns, data, fillHeight = true, searchPlaceholder }: DataTableProps<TData>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [showSearch, setShowSearch] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const selectionColumn = useMemo(() => createColumnHelper<TData>().display({
    id: 'select',
    header: ({ table }) => <Checkbox aria-label="选择当前页全部记录" checked={table.getIsAllPageRowsSelected()} indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()} onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)} />,
    cell: ({ row }) => <Checkbox aria-label="选择当前记录" checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(value === true)} />,
    enableHiding: false,
    enableSorting: false,
  }), [])

  const table = useReactTable({
    columns: [selectionColumn, ...columns],
    data,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: { columnFilters, columnVisibility, globalFilter, pagination, rowSelection, sorting },
  })

  return (
    <div className={fillHeight ? 'flex h-full min-h-0 flex-col gap-4' : 'flex flex-col gap-4'}>
      <div className="flex items-center gap-1 md:gap-2">
        {showSearch ? <Input autoFocus className="w-full sm:w-64" onBlur={() => { if (!globalFilter) setShowSearch(false) }} onChange={(event) => table.setGlobalFilter(event.target.value)} placeholder={searchPlaceholder} value={globalFilter} /> : <TooltipProvider><Tooltip><TooltipTrigger render={<Button onClick={() => setShowSearch(true)} size="sm" variant="ghost" />}><Search /></TooltipTrigger><TooltipContent>搜索</TooltipContent></Tooltip></TooltipProvider>}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}><Settings2 />视图</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44"><DropdownMenuGroup><DropdownMenuLabel>显示列</DropdownMenuLabel><DropdownMenuSeparator />
            {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => <DropdownMenuCheckboxItem checked={column.getIsVisible()} key={column.id} onCheckedChange={(value) => column.toggleVisibility(value === true)}>{String(column.columnDef.header ?? column.id)}</DropdownMenuCheckboxItem>)}
          </DropdownMenuGroup></DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AnimatedTableWrapper className={cn('overflow-hidden rounded-xl border', fillHeight && 'min-h-0 flex-1 overflow-auto')}>
        <Table className={cn('min-w-full', centered && '[&_th]:text-center [&_td]:text-center')}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const headerContent = (
                    <span className={cn('flex items-center gap-1 text-sm font-semibold', centered && 'justify-center')}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        header.column.getIsSorted() === 'asc'
                          ? <ArrowUp size={14} />
                          : header.column.getIsSorted() === 'desc'
                            ? <ArrowDown size={14} />
                            : <ChevronsUpDown size={14} />
                      )}
                    </span>
                  )

                  return (
                    <TableHead className="px-4 py-2" key={header.id}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <Button
                          className={cn('-ml-2 h-auto px-2 py-1', centered && 'mx-auto')}
                          onClick={header.column.getToggleSortingHandler()}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          {headerContent}
                        </Button>
                      ) : headerContent}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <AnimatedTableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row, index) => (
              <AnimatedTableRow
                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                data-state={row.getIsSelected() ? 'selected' : undefined}
                index={index}
                key={row.id}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell className="px-4 py-2" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </AnimatedTableRow>
            )) : (
              <AnimatedTableRow index={0}>
                <TableCell className="h-24 text-center" colSpan={table.getVisibleLeafColumns().length}>暂无匹配记录。</TableCell>
              </AnimatedTableRow>
            )}
          </AnimatedTableBody>
        </Table>
      </AnimatedTableWrapper>
      {table.getPageCount() > 0 && <div className="mt-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2"><p className="text-sm text-muted-foreground">每页显示</p><Select onValueChange={(value) => table.setPageSize(Number(value))} value={String(table.getState().pagination.pageSize)}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{pageSizes.map((pageSize) => <SelectItem key={pageSize} value={String(pageSize)}>{pageSize}</SelectItem>)}</SelectContent></Select><p className="text-sm text-muted-foreground">条</p></div>
        <div className="flex items-center gap-3"><p className="text-sm font-normal text-muted-foreground">{table.getRowModel().rows.length ? `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-${Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} / ${table.getFilteredRowModel().rows.length}` : '0 / 0'}</p><div className="flex items-center gap-1"><Button aria-label="上一页" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} size="icon-sm" type="button" variant="ghost"><ChevronLeft /></Button><Button aria-current="page" size="icon" type="button" variant="outline">{table.getState().pagination.pageIndex + 1}</Button><Button aria-label="下一页" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} size="icon-sm" type="button" variant="ghost"><ChevronRight /></Button></div></div>
      </div>}
    </div>
  )
}
