import { createColumnHelper } from '@tanstack/react-table';

import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp';
import BasicTable from 'src/components/tables/basic-table/BasicTable';
import CheckboxTable from 'src/components/tables/checkbox-table/CheckboxTable';
import HoverTable from 'src/components/tables/hover-table/HoverTable';
import StripedRowTable from 'src/components/tables/striped-row-table/StripedRowTable';
import { DataTable, type DataTableFeatures } from 'src/components/data-table/data-table';
import { Avatar, AvatarFallback, AvatarImage } from 'src/components/ui/avatar';
import { Badge } from 'src/components/ui/badge';
import { EmployeeData, type EmployeeRow } from 'src/components/tables/table-data';
import StyleDivider from 'src/components/shared/StyleDivider';
import StyleAwareWrapper from 'src/components/shared/StyleAwareWrapper';

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Tables' },
];

const employeeColumnHelper = createColumnHelper<DataTableFeatures, EmployeeRow>();
const employeeColumns = employeeColumnHelper.columns([
  employeeColumnHelper.accessor('name', {
    header: '员工',
    cell: ({ row }) => <div className="flex items-center gap-2"><Avatar><AvatarImage alt={row.original.name} src={row.original.avatar} /><AvatarFallback>{row.original.name.slice(0, 1)}</AvatarFallback></Avatar><span className="font-medium">{row.original.name}</span></div>,
  }),
  employeeColumnHelper.accessor('department', { header: '部门' }),
  employeeColumnHelper.accessor('position', { header: '职位' }),
  employeeColumnHelper.accessor('salary', { header: '薪资' }),
  employeeColumnHelper.accessor('status', {
    header: '状态',
    cell: ({ row }) => <Badge className={row.original.status === 'Active' ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'} variant="secondary">{row.original.status}</Badge>,
  }),
]);

function TablesPage() {
  return (
    <StyleAwareWrapper
      lyraClassName="flex flex-col p-px gap-px bg-border"
    >
      <BreadcrumbComp title="Tables" items={BCrumb} />
      <StyleDivider />

      <StyleAwareWrapper
        lyraClassName="grid grid-cols-12 gap-px bg-border">
        <div className="col-span-12">
          <BasicTable />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
        <div className="col-span-12">
          <DataTable columns={employeeColumns} data={EmployeeData} searchPlaceholder="搜索员工…" />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
        <div className="col-span-12">
          <HoverTable />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
        <div className="col-span-12">
          <StripedRowTable />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
        <div className="col-span-12">
          <CheckboxTable />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
      </StyleAwareWrapper>

    </StyleAwareWrapper>
  );
}

export default TablesPage;
