import { http, HttpResponse } from 'msw';
import type {
  AccountSettingsData,
  AiSettings,
  AppIntegration,
  EmailBinding,
  NotificationSettings,
  SecuritySettings,
} from 'src/types/apps/settings';

/**
 * 账户设置模拟数据：后端接口尚未提供，先由 MSW 拦截并维护内存状态，
 * 刷新页面后恢复为下方默认值。
 */
let SettingsData: AccountSettingsData = {
  ai: {
    provider: 'OpenAI',
    model: 'GPT-4o',
    temperature: 0.7,
    maxTokens: 4096,
    language: '简体中文',
    systemPrompt:
      '你是 Mindforge 工作区的 AI 助手，回答保持简洁、专业，优先使用中文。',
    features: {
      smartSummary: true,
      autoTag: true,
      dailyReviewDraft: false,
      emailComposeAssist: true,
    },
  },
  apps: [
    {
      id: 'projects',
      name: '项目管理',
      description: '同步项目、任务与看板状态，支持 AI 自动拆解任务。',
      enabled: true,
      options: { syncFrequency: '实时', notify: true, aiAssist: true },
    },
    {
      id: 'mail',
      name: '邮件中心',
      description: '聚合已绑定邮箱的收件箱，支持 AI 摘要与智能分类。',
      enabled: true,
      options: { syncFrequency: '每小时', notify: true, aiAssist: true },
    },
    {
      id: 'daily-review',
      name: '每日复盘',
      description: '每晚汇总当日任务与邮件，生成复盘草稿。',
      enabled: true,
      options: { syncFrequency: '每天', notify: false, aiAssist: true },
    },
    {
      id: 'notes',
      name: 'Notes',
      description: '笔记与知识库，支持全文检索和 AI 问答。',
      enabled: true,
      options: { syncFrequency: '实时', notify: false, aiAssist: false },
    },
    {
      id: 'blog',
      name: 'Blogs',
      description: '博客内容管理，AI 可辅助生成草稿与配图建议。',
      enabled: false,
      options: { syncFrequency: '手动', notify: false, aiAssist: false },
    },
    {
      id: 'tickets',
      name: 'Tickets',
      description: '工单系统，支持自动分派与优先级建议。',
      enabled: false,
      options: { syncFrequency: '每小时', notify: true, aiAssist: false },
    },
  ],
  emails: [
    {
      id: 1,
      email: 'mathew.anderson@gmail.com',
      provider: 'Gmail',
      isPrimary: true,
      verified: true,
      boundAt: '2025-11-02',
    },
    {
      id: 2,
      email: 'mathew@unorva.com',
      provider: '企业邮箱',
      isPrimary: false,
      verified: true,
      boundAt: '2026-01-18',
    },
    {
      id: 3,
      email: 'm.anderson@outlook.com',
      provider: 'Outlook',
      isPrimary: false,
      verified: false,
      boundAt: '2026-08-30',
    },
  ],
  notifications: {
    emailNotifications: true,
    inAppNotifications: true,
    dailyReviewReminder: true,
    projectUpdates: true,
    ticketUpdates: false,
    aiWeeklyReport: false,
  },
  security: {
    twoFactor: false,
    loginAlerts: true,
    sessionTimeout: '8 小时',
    activeSessions: [
      {
        id: 1,
        device: 'Chrome · Windows 11',
        location: '上海，中国',
        lastActive: '当前会话',
        current: true,
      },
      {
        id: 2,
        device: 'Safari · iPhone 17',
        location: '上海，中国',
        lastActive: '2 小时前',
        current: false,
      },
      {
        id: 3,
        device: 'Edge · Windows 10',
        location: '北京，中国',
        lastActive: '3 天前',
        current: false,
      },
    ],
  },
};

let nextEmailId = SettingsData.emails.length + 1;

const success = () =>
  HttpResponse.json({ status: 200, msg: 'Success', data: SettingsData });

const failure = (error: unknown) =>
  HttpResponse.json({ status: 400, msg: 'Internal server error', error });

export const SettingsHandlers = [
  // 获取全部账户设置
  http.get('/api/data/settings/SettingsData', () => {
    try {
      return success();
    } catch (error) {
      return failure(error);
    }
  }),

  // 保存 AI 配置
  http.put('/api/data/settings/ai', async ({ request }) => {
    try {
      const ai = (await request.json()) as AiSettings;
      SettingsData = { ...SettingsData, ai };
      return success();
    } catch (error) {
      return failure(error);
    }
  }),

  // 保存 APP 配置
  http.put('/api/data/settings/apps', async ({ request }) => {
    try {
      const apps = (await request.json()) as AppIntegration[];
      SettingsData = { ...SettingsData, apps };
      return success();
    } catch (error) {
      return failure(error);
    }
  }),

  // 绑定新邮箱（默认未验证）
  http.post('/api/data/settings/emails/bind', async ({ request }) => {
    try {
      const { email, provider } = (await request.json()) as {
        email: string;
        provider: string;
      };
      const binding: EmailBinding = {
        id: nextEmailId++,
        email,
        provider,
        isPrimary: SettingsData.emails.length === 0,
        verified: false,
        boundAt: new Date().toISOString().slice(0, 10),
      };
      SettingsData = {
        ...SettingsData,
        emails: [...SettingsData.emails, binding],
      };
      return success();
    } catch (error) {
      return failure(error);
    }
  }),

  // 模拟发送验证邮件并标记为已验证
  http.put('/api/data/settings/emails/verify', async ({ request }) => {
    try {
      const { id } = (await request.json()) as { id: number };
      SettingsData = {
        ...SettingsData,
        emails: SettingsData.emails.map((item) =>
          item.id === id ? { ...item, verified: true } : item
        ),
      };
      return success();
    } catch (error) {
      return failure(error);
    }
  }),

  // 设为主要邮箱
  http.put('/api/data/settings/emails/primary', async ({ request }) => {
    try {
      const { id } = (await request.json()) as { id: number };
      SettingsData = {
        ...SettingsData,
        emails: SettingsData.emails.map((item) => ({
          ...item,
          isPrimary: item.id === id,
        })),
      };
      return success();
    } catch (error) {
      return failure(error);
    }
  }),

  // 解绑邮箱（主要邮箱不允许解绑）
  http.delete('/api/data/settings/emails/unbind', async ({ request }) => {
    try {
      const { id } = (await request.json()) as { id: number };
      const target = SettingsData.emails.find((item) => item.id === id);
      if (target?.isPrimary) {
        // HTTP 400 会由 global-fetcher 统一弹出错误提示
        return HttpResponse.json(
          { status: 400, message: '主要邮箱不能解绑，请先切换主要邮箱。' },
          { status: 400 }
        );
      }
      SettingsData = {
        ...SettingsData,
        emails: SettingsData.emails.filter((item) => item.id !== id),
      };
      return success();
    } catch (error) {
      return failure(error);
    }
  }),

  // 保存通知设置
  http.put('/api/data/settings/notifications', async ({ request }) => {
    try {
      const notifications = (await request.json()) as NotificationSettings;
      SettingsData = { ...SettingsData, notifications };
      return success();
    } catch (error) {
      return failure(error);
    }
  }),

  // 保存安全设置（含会话管理、密码修改仅为模拟）
  http.put('/api/data/settings/security', async ({ request }) => {
    try {
      const security = (await request.json()) as SecuritySettings;
      SettingsData = { ...SettingsData, security };
      return success();
    } catch (error) {
      return failure(error);
    }
  }),
];
