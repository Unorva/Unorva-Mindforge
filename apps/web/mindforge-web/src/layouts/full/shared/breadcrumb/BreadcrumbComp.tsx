import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router";


interface BreadcrumbItem {
  to?: string;
  title: string;
}

interface BreadCrumbType {
  subtitle?: string;
  items?: BreadcrumbItem[];
  title: string;
  extra?: ReactNode;
  showHome?: boolean;
}

const BreadcrumbComp = ({ extra, items = [], showHome = true, title }: BreadCrumbType) => {
  const navigationItems = items
    .filter((item, index) => !(showHome && index === 0 && item.to === "/"))
    .filter((item, index, list) => !(index === list.length - 1 && item.title === title));
  const breadcrumbs: BreadcrumbItem[] = [
    ...(showHome ? [{ to: "/", title: "Home" }] : []),
    ...navigationItems,
    { title },
  ];

  return (
    <>
      <Card
        className={`py-5 px-6 bg-background  overflow-hidden rounded-xl border`}
      >
        <div className="flex items-center justify-between gap-6 relative">
          <h4 className="font-semibold text-xl text-forground">{title}</h4>
          <div className="flex items-center gap-4">
          {extra}
          <ol
            className="flex items-center whitespace-nowrap"
            aria-label="Breadcrumb"
          >
            {breadcrumbs.map((item, index) => {
              const isCurrentPage = index === breadcrumbs.length - 1;

              return (
                <li className="flex items-center" key={`${item.title}-${index}`}>
                  {index > 0 && <div className="mx-2 p-0.5 text-forground">/</div>}
                  {item.to && !isCurrentPage ? (
                    <Link className="text-forground text-sm leading-none" to={item.to}>
                      {item.title}
                    </Link>
                  ) : (
                    <span
                      aria-current={isCurrentPage ? "page" : undefined}
                      className="text-forground text-sm leading-none opacity-80"
                    >
                      {item.title}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          </div>
        </div>
      </Card>
    </>
  );
};

export default BreadcrumbComp;
