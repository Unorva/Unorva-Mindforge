import { uniqueId } from "lodash";
import {
  BookOpen,
  Bot,
  ChartColumnStacked,
  ClipboardCheck,
  FileText,
  FolderKanban,
  House,
  Mail,
  MessageCircleMore,
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
        name: "数据总览",
        icon: House,
        url: "/",
      },
      {
        id: uniqueId(),
        name: "智能助手",
        icon: MessageCircleMore,
        url: "/apps/ai",
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
        name: "复盘报告",
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
        name: "笔记管理",
        icon: NotebookText,
        url: "/apps/notes",
      },
      {
        id: uniqueId(),
        name: "博客中心",
        icon: BookOpen,
        items: [
          {
            id: uniqueId(),
            name: "博客列表",
            url: "/apps/blog/post",
          },
          {
            id: uniqueId(),
            name: "博客详情",
            url: "/apps/blog/detail/流媒体视频还没流行就将在明天停服",
          },
          {
            id: uniqueId(),
            name: "编辑博客",
            url: "/apps/blog/edit",
          },
          {
            id: uniqueId(),
            name: "新建博客",
            url: "/apps/blog/create",
          },
          {
            id: uniqueId(),
            name: "管理博客",
            url: "/apps/blog/manage-blog",
          },
        ],
      },
    ],
  },
  {
    heading: "开发",
    items: [
      {
        id: uniqueId(),
        name: "图表测试",
        icon: ChartColumnStacked,
        url: "/components/segmented-bar-chart",
      },
      {
        id: uniqueId(),
        name: "编辑测试",
        icon: FileText,
        url: "/components/markdown-editor",
      },
      {
        id: uniqueId(),
        name: "AI 动画测试",
        icon: Bot,
        url: "/components/ai-avatar",
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
