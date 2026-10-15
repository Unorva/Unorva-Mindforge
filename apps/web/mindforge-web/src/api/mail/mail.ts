import { deleteFetcher, getFetcher, patchFetcher, postFetcher } from '@/api/global-fetcher';
import type { ApiResult } from '@/types/api';

export type MailFolder = 'inbox' | 'draft' | 'sending' | 'sent' | 'archive' | 'trash';
export type MailSecurity = 'ssl' | 'starttls';
export type MailAuthType = 'password' | 'oauth2';

export interface MailProvider {
  id: string;
  name: string;
  authType: MailAuthType;
  imapHost: string;
  imapPort: number;
  imapSecurity: MailSecurity;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: MailSecurity;
  helpText: string;
  helpUrl: string;
}

export interface MailAccountInput {
  id?: number;
  provider: string;
  email: string;
  displayName: string;
  username: string;
  password?: string;
  authType: MailAuthType;
  imapHost: string;
  imapPort: number;
  imapSecurity: MailSecurity;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: MailSecurity;
  enabled: boolean;
  isDefault: boolean;
}

export interface MailAccount extends Omit<MailAccountInput, 'id' | 'password'> {
  id: number;
  credentialConfigured: boolean;
  status: 'unverified' | 'connected' | 'error';
  lastError: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MailItem {
  id: number;
  accountId: number | null;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  folder: MailFolder;
  starred: boolean;
  unread: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface SendMailInput {
  id?: number;
  accountId: number;
  recipient: string;
  subject: string;
  body: string;
}

export const getMails = (accountId?: number): Promise<ApiResult<MailItem[]>> =>
  getFetcher('/mail', { accountId });
export const saveMail = (mail: Partial<MailItem>): Promise<ApiResult<MailItem>> =>
  postFetcher('/mail/upsert', mail);
export const updateMail = (id: number, updates: Partial<MailItem>): Promise<ApiResult<MailItem>> =>
  patchFetcher(`/mail/${id}`, updates);
export const deleteMail = (id: number): Promise<ApiResult<void>> => deleteFetcher(`/mail/${id}`);
export const getMailProviders = (): Promise<ApiResult<MailProvider[]>> =>
  getFetcher('/mail/providers');
export const getMailAccounts = (): Promise<ApiResult<MailAccount[]>> =>
  getFetcher('/mail/accounts');
export const saveMailAccount = (account: MailAccountInput): Promise<ApiResult<MailAccount>> =>
  postFetcher('/mail/accounts/upsert', account);
export const deleteMailAccount = (id: number): Promise<ApiResult<void>> =>
  deleteFetcher(`/mail/accounts/${id}`);
export const testMailAccount = (
  id: number,
): Promise<ApiResult<{ success: boolean; message: string }>> =>
  postFetcher(`/mail/accounts/${id}/test`);
export const syncMailAccount = (
  id: number,
): Promise<ApiResult<{ accountId: number; syncedCount: number; message: string }>> =>
  postFetcher(`/mail/accounts/${id}/sync`);
export const sendMail = (mail: SendMailInput): Promise<ApiResult<MailItem>> =>
  postFetcher('/mail/send', mail);
export const recoverMailSend = (id: number): Promise<ApiResult<MailItem>> =>
  postFetcher(`/mail/${id}/recover-send`);
