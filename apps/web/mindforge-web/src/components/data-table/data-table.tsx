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
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type DataTableProps<TData extends RowData> = {
  centered?: boolean
  // 同一张业务表会同时包含字符串、日期、枚举和操作列；v8 需以宽泛值类型承接异构列。
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
      <div className={cn('overflow-hidden rounded-xl border', fillHeight && 'min-h-0 flex-1 overflow-auto')}>
        <div className="overflow-x-auto">
          <table className={cn('min-w-full', centered && '[&_th]:text-center [&_td]:text-center')}>
            <thead>{table.getHeaderGroups().map((headerGroup) => <tr key={headerGroup.id}>{headerGroup.headers.map((header) => <th className="border-b px-4 py-2 text-left" key={header.id}>{header.isPlaceholder ? null : <div className={header.column.getCanSort() ? 'cursor-pointer select-none' : undefined} onClick={header.column.getToggleSortingHandler()}><div className={cn('flex items-center gap-1 text-sm font-semibold', centered && 'justify-center')}>{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getCanSort() && (header.column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : header.column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ChevronsUpDown size={14} />)}</div></div>}</th>)}</tr>)}</thead>
            <tbody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <tr className="border-b last:border-b-0" data-state={row.getIsSelected() && 'selected'} key={row.id}>{row.getVisibleCells().map((cell) => <td className="px-4 py-2" key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>) : <tr><td className="h-24 text-center" colSpan={table.getVisibleLeafColumns().length}>暂无匹配记录。</td></tr>}</tbody>
          </table>
        </div>
      </div>
      {table.getPageCount() > 0 && <div className="mt-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2"><p className="text-sm text-muted-foreground">每页显示</p><Select onValueChange={(value) => table.setPageSize(Number(value))} value={String(table.getState().pagination.pageSize)}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{pageSizes.map((pageSize) => <SelectItem key={pageSize} value={String(pageSize)}>{pageSize}</SelectItem>)}</SelectContent></Select><p className="text-sm text-muted-foreground">条</p></div>
        <div className="flex items-center gap-3"><p className="text-sm font-normal text-muted-foreground">{table.getRowModel().rows.length ? `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-${Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} / ${table.getFilteredRowModel().rows.length}` : '0 / 0'}</p><div className="flex items-center gap-2"><ChevronLeft className={cn('cursor-pointer text-muted-foreground hover:text-primary', !table.getCanPreviousPage() && 'pointer-events-none opacity-50')} onClick={() => table.previousPage()} size={20} /><span className="flex size-8 items-center justify-center rounded-md text-sm font-normal text-primary">{table.getState().pagination.pageIndex + 1}</span><ChevronRight className={cn('cursor-pointer text-muted-foreground hover:text-primary', !table.getCanNextPage() && 'pointer-events-none opacity-50')} onClick={() => table.nextPage()} size={20} /></div></div>
      </div>}
    </div>
  )
}
