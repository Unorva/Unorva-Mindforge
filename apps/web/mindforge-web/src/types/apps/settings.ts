/**
 * 账户设置相关类型定义（当前全部由 MSW 模拟数据驱动）。
 */

/** AI 配置 */
export interface AiSettings {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  language: string;
  systemPrompt: string;
  features: {
    smartSummary: boolean;
    autoTag: boolean;
    dailyReviewDraft: boolean;
    emailComposeAssist: boolean;
  };
}

/** 单个 APP 的集成配置 */
export interface AppIntegration {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  options: {
    syncFrequency: '实时' | '每小时' | '每天' | '手动';
    notify: boolean;
    aiAssist: boolean;
  };
}

/** 邮箱绑定记录 */
export interface EmailBinding {
  id: number;
  email: string;
  provider: string;
  isPrimary: boolean;
  verified: boolean;
  boundAt: string;
}

/** 通知设置 */
export interface NotificationSettings {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  dailyReviewReminder: boolean;
  projectUpdates: boolean;
  ticketUpdates: boolean;
  aiWeeklyReport: boolean;
}

/** 活跃登录会话 */
export interface ActiveSession {
  id: number;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

/** 安全设置 */
export interface SecuritySettings {
  twoFactor: boolean;
  loginAlerts: boolean;
  sessionTimeout: '30 分钟' | '2 小时' | '8 小时' | '24 小时';
  activeSessions: ActiveSession[];
}

/** 账户设置聚合数据（GET /api/data/settings/SettingsData 的 data 字段） */
export interface AccountSettingsData {
  ai: AiSettings;
  apps: AppIntegration[];
  emails: EmailBinding[];
  notifications: NotificationSettings;
  security: SecuritySettings;
}
