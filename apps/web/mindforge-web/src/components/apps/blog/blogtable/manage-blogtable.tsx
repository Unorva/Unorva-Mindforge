
import { useContext, useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  getPaginationRowModel,
  createColumnHelper,
} from "@tanstack/react-table";
import { Pen, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipProvider,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedTableBody, AnimatedTableRow, AnimatedTableWrapper } from "@/components/animated-components/animated-table";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { BlogContext } from "src/context/blog-context";
import { BlogPostType } from "src/types/apps/blog";
import { useNavigate } from "react-router";

const ManageBlogTable = () => {
  const { posts } = useContext(BlogContext);
  const [tableData, setTableData] = useState<BlogPostType[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [rowSelection, setRowSelection] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionDeleteId, setActionDeleteId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 7, // default
  });
  const pageSizes = [3, 7, 10];

  const navigate = useNavigate();

  useEffect(() => {
    setTableData(posts);
  }, [posts]);

  const columnHelper = createColumnHelper<BlogPostType>();

  const columns = [
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(checked) =>
            table.toggleAllPageRowsSelected(checked === true)

          }
          className={"cursor-pointer"}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={!!row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked === true)}
          className={"cursor-pointer"}

        />
      ),
    }),
    columnHelper.accessor("title", {
      header: "Title",
      cell: (info) => {
        const { title, coverImg } = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <img
              src={coverImg || ""}
              alt={title || ""}
              className="w-12 h-9 object-cover rounded"
              width={48}
              height={36}
            />
            <span className="text-sm font-medium truncate block text-inherit leading-normal max-w-[200px]">
              {title}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("category", {
      header: "Category",
      cell: (info) => {
        const category = info.getValue() ?? "Unknown";

        const categoryColors: Record<string, string> = {
          Design: "bg-chart-2/12! text-chart-2!",
          Lifestyle: "bg-chart-4/12! text-chart-4!",
          Gadget: "bg-primary/5! text-primary!",
          Social: "bg-destructive/12! text-destructive!",
          Health: "bg-chart-5/12! text-chart-5!",
        };

        return (
          <Badge
            className={`text-xs font-medium ${categoryColors[category] ?? "bg-muted text-muted-foreground"
              }`}
            variant="secondary"
          >
            {category}
          </Badge>
        );
      },
    }),
    columnHelper.accessor((row) => row.author, {
      id: "authorName",
      header: "Author",
      cell: (info) => (
        <div className="flex items-center gap-2 whitespace-nowrap ">
          <Avatar>
            <AvatarImage
              src={info.getValue()?.avatar}
              alt={info.getValue()?.name}
            />
            <AvatarFallback>{info?.getValue()?.name}</AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium ">{info.getValue()?.name}</p>
        </div>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Created At",
      cell: (info) => {
        const dateValue = info.getValue();
        return (
          <span>
            {dateValue ? new Date(dateValue).toLocaleDateString() : "—"}
          </span>
        );
      },
    }),
    columnHelper.accessor("published", {
      header: "published",
      cell: ({ row }) => {
        const postId = row.original.id;
        const published = row.original.published;

        const togglePublished = () => {
          const updatedData = tableData.map((item) =>
            item.id === postId ? { ...item, published: !item.published } : item
          );
          setTableData(updatedData);
        };

        return (
          <>
            <Switch checked={published} onCheckedChange={togglePublished} className={"cursor-pointer"} />
          </>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const { id } = row.original;

        const handleEdit = () => {
          navigate("/apps/blog/edit");
        };

        const handleRowDelete = () => {
          // Programmatically select this row
          setRowSelection((prev) => ({
            ...prev,
            [row.id]: true,
          }));

          // Track this specific row's ID for targeted deletion
          setActionDeleteId(String(id));

          // Show confirmation modal
          setShowConfirm(true);
        };

        return (
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    onClick={handleEdit}
                    size={"sm"}
                    variant={"outline"}
                    className={"h-8! w-8! rounded-md! hover:bg-primary/5 bg-background"}
                  >
                    <Pen size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Blog</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    size={"sm"}
                    onClick={handleRowDelete}
                    variant={"outline"}
                    className={"h-8! w-8! rounded-md! text-destructive! bg-background hover:bg-destructive/5"}
                  >
                    <Trash2 size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Blog</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    }),
  ];
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      globalFilter,
      rowSelection,
      pagination,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    // TanStack 在跨列搜索时由 columnId 决定返回值类型，运行时再统一转为字符串比较。
    globalFilterFn: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      row: { getValue: (arg0: any) => any },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      columnId: any,
      filterValue: string
    ) => {
      return String(row.getValue(columnId))
        .toLowerCase()
        .includes(filterValue.toLowerCase());
    },
  });

  const handleDelete = () => {
    let selectedIds: string[];

    if (actionDeleteId) {
      selectedIds = [actionDeleteId];
    } else {
      selectedIds = table
        .getSelectedRowModel()
        .rows.map((row) => String(row.original.id));
    }

    const newData = tableData.filter(
      (item) => !selectedIds.includes(String(item.id))
    );

    setTableData(newData);
    setRowSelection({});
    setShowConfirm(false);
    setActionDeleteId(null); // reset
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ">
          <CardTitle>
            <h3 className="text-base font-semibold   mb-4 md:mb-0">Blog List</h3>
          </CardTitle>
          <div className="flex items-center gap-1 md:gap-2">
            {/* Search */}
            {!showSearch ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      size={"sm"}
                      onClick={() => setShowSearch(true)}
                      variant={"ghost"}
                    >

                      <SearchIcon size={16}

                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Search</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Input
                autoFocus
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="pl-3"
                onBlur={() => {
                  if (!globalFilter) setShowSearch(false);
                }}
                placeholder="Search blogs..."
              />
            )}
            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value || "");
                table.getColumn("category")?.setFilterValue(value);
              }}
            >
              <SelectTrigger className={"cursor-pointer"}>
                <SelectValue>
                  {categoryFilter ? categoryFilter : "All Categories"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem className={"cursor-pointer"} value="Design">Design</SelectItem>
                <SelectItem className={"cursor-pointer"} value="Lifestyle">Lifestyle</SelectItem>
                <SelectItem className={"cursor-pointer"} value="Gadget">Gadget</SelectItem>
                <SelectItem className={"cursor-pointer"} value="Social">Social</SelectItem>
                <SelectItem className={"cursor-pointer"} value="Health">Health</SelectItem>
              </SelectContent>
            </Select>
            {/* Bulk delete button */}
            {table.getIsAllPageRowsSelected() && (
              <Button
                variant="destructive"
                onClick={() => setShowConfirm(true)}
              >
                <Trash2 size={18} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <div>
        <CardContent>
          <AnimatedTableWrapper className="overflow-hidden rounded-xl border">
              <Table className="min-w-full">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="px-4 py-2"
                        >
                          {header.isPlaceholder ? null : (
                            header.column.getCanSort() ? (
                            <Button
                              className="-ml-2 h-auto px-2 py-1"
                              onClick={header.column.getToggleSortingHandler()}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              <span className="flex items-center gap-1 text-sm font-semibold">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {header.column.getCanSort() && (
                                  <>
                                    {header.column.getIsSorted() === "asc" && (
                                      <ChevronUp size={14} />
                                    )}
                                    {header.column.getIsSorted() === "desc" && (
                                      <ChevronDown size={14} />
                                    )}
                                    {header.column.getIsSorted() === false && (
                                      <ChevronsUpDown size={14} />
                                    )}
                                  </>
                                )}
                              </span>
                            </Button>
                            ) : flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <AnimatedTableBody>
                  {table.getRowModel().rows.length === 0 ? (
                    <AnimatedTableRow index={0}>
                      <TableCell colSpan={columns.length} className="py-4 text-center">
                        <div className="flex flex-col items-center">
                          <img
                            src="/images/svgs/no-data.webp"
                            alt="No data"
                            height={100}
                            width={100}
                            className="mb-4"
                          />
                        </div>
                        No data found!
                      </TableCell>
                    </AnimatedTableRow>
                  ) : (
                    table.getRowModel().rows.map((row, index) => (
                      <AnimatedTableRow
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        data-state={row.getIsSelected() ? "selected" : undefined}
                        index={index}
                        key={row.id}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-4 py-2">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </AnimatedTableRow>
                    ))
                  )}
                </AnimatedTableBody>
              </Table>
          </AnimatedTableWrapper>

          {/* Pagination Controls */}
          {table.getPageCount() > 0 ? (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 gap-3">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground ">Show</p>
                <Select
                  value={String(table.getState().pagination.pageSize)}
                  onValueChange={(value) => table.setPageSize(Number(value))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {pageSizes.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground ">per page</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Page Summary */}
                <div>
                  <p className="text-sm font-normal text-muted-foreground">
                    {table.getRowModel().rows.length > 0
                      ? `${table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                      1
                      }-${Math.min(
                        (table.getState().pagination.pageIndex + 1) *
                        table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length
                      )} of ${table.getFilteredRowModel().rows.length}`
                      : `0 of 0`}
                  </p>
                </div>
                {/* Custom Pagination Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    aria-label="Previous page"
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.previousPage()}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button aria-current="page" size="icon" type="button" variant="outline">
                    {table.getState().pagination.pageIndex + 1}
                  </Button>
                  <Button
                    aria-label="Next page"
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.nextPage()}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
              </DialogHeader>
              <div className="text-center">
                <p className="mb-5 text-lg font-normal text-muted-foreground">
                  Are you sure you want to delete the selected posts?
                </p>
              </div>
              <DialogFooter className="flex justify-center gap-4">
                <Button
                  onClick={handleDelete}
                  className={"bg-primary/5 text-primary hover:bg-primary/30 "}
                >
                  Yes, Delete
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </div>
    </Card>
  );
};

export default ManageBlogTable;
