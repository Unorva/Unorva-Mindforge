import { uniqueId } from "lodash";
import {
  BookOpen,
  ClipboardCheck,
  FolderKanban,
  House,
  Mail,
  NotebookText,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface ChildItem {
  id?: number | string;
  name: string;
  icon?: LucideIcon;
  items?: ChildItem[];
  item?: unknown;
  url?: string;
  color?: string;
  disabled?: boolean;
  subtitle?: string;
  badge?: boolean;
  badgeType?: string;
  badgeContent?: string;
  isActive?: boolean;
  external?: boolean;
  isPro?: boolean;
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: LucideIcon;
  id?: number;
  to?: string;
  item?: MenuItem[];
  items?: ChildItem[];
  url?: string;
  disabled?: boolean;
  subtitle?: string;
  badgeType?: string;
  badge?: boolean;
  badgeContent?: string;
  isActive?: boolean;
  isPro?: boolean;
}

const SidebarContent: MenuItem[] = [
  {
    heading: "控制台",
    items: [
      {
        id: uniqueId(),
        name: "控制台",
        icon: House,
        url: "/",
      },
    ],
  },
  {
    heading: "个人",
    items: [
      {
        id: uniqueId(),
        name: "邮件中心",
        icon: Mail,
        url: "/apps/mail",
      },
      {
        id: uniqueId(),
        name: "每日复盘",
        icon: ClipboardCheck,
        url: "/apps/daily-review",
      },
      {
        id: uniqueId(),
        name: "资金管理",
        icon: Wallet,
        url: "/apps/finance",
      },
      {
        id: uniqueId(),
        name: "Notes",
        icon: NotebookText,
        url: "/apps/notes",
      },
      {
        id: uniqueId(),
        name: "Blogs",
        icon: BookOpen,
        items: [
          {
            id: uniqueId(),
            name: "Blog Listing",
            url: "/apps/blog/post",
          },
          {
            id: uniqueId(),
            name: "Blog Detail",
            url: "/apps/blog/detail/streaming-video-way-before-it-was-cool-go-dark-tomorrow",
          },
          {
            id: uniqueId(),
            name: "Blog Edit",
            url: "/apps/blog/edit",
          },
          {
            id: uniqueId(),
            name: "Blog Create",
            url: "/apps/blog/create",
          },
          {
            id: uniqueId(),
            name: "Manage Blog",
            url: "/apps/blog/manage-blog",
          },
        ],
      },
    ],
  },
  {
    heading: "团队",
    items: [
      {
        id: uniqueId(),
        name: "项目管理",
        icon: FolderKanban,
        url: "/apps/projects",
      },
    ],
  },
];

export default SidebarContent;
