import { deleteFetcher, getFetcher, postFetcher } from '@/api/global-fetcher';
import type { ApiResult } from '@/types/api';
import { clearAccessToken, getAccessToken } from '@/utils/auth';
import { consumeEventStream } from './event-stream';

export interface AiConfig {
  configured: boolean;
  provider: string;
  model: string;
  capabilities: string[];
  enabled: boolean;
  models: string[];
}

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface MessageReply {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  conversation: Conversation;
}

export interface AiActivity {
  type: 'thinking' | 'tool';
  name?: string;
  state?: 'running' | 'complete' | 'requested';
  detail?: string;
}

export interface StreamCallbacks {
  onContent: (delta: string) => void;
  onReasoning: (delta: string) => void;
  onActivity: (activity: AiActivity) => void;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function streamMessage(
  id: number,
  content: string,
  callbacks: StreamCallbacks,
  signal: AbortSignal,
): Promise<MessageReply> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  const token = getAccessToken();
  const response = await fetch(`${baseUrl}/ai/conversations/${id}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ content }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(200000)]),
  });
  if (response.status === 401) {
    clearAccessToken();
    window.location.assign('/auth/auth2/login');
  }
  if (!response.ok || !response.headers.get('Content-Type')?.includes('text/event-stream')) {
    const payload: unknown = await response.json().catch(() => undefined);
    throw new Error(
      isObject(payload) && typeof payload.message === 'string'
        ? payload.message
        : 'AI 流式连接失败，请重试。',
    );
  }
  if (!response.body) throw new Error('浏览器未能读取 AI 流式回复');
  let reply: MessageReply | undefined;
  await consumeEventStream(response.body, ({ event, data }) => {
    if (!['content', 'reasoning', 'activity', 'error', 'done'].includes(event)) return;
    if (!isObject(data)) throw new Error('AI 流式响应格式错误');
    if (event === 'content' || event === 'reasoning') {
      if (typeof data.delta !== 'string') throw new Error('AI 流式文本格式错误');
      if (event === 'content') callbacks.onContent(data.delta);
      else callbacks.onReasoning(data.delta);
    } else if (event === 'activity') {
      if (data.type === 'thinking' || data.type === 'tool') {
        callbacks.onActivity({
          type: data.type,
          name: typeof data.name === 'string' ? data.name : undefined,
          state: ['running', 'complete', 'requested'].includes(String(data.state))
            ? (data.state as AiActivity['state'])
            : undefined,
          detail: typeof data.detail === 'string' ? data.detail : undefined,
        });
      }
    } else if (event === 'error') {
      throw new Error(typeof data.message === 'string' ? data.message : 'AI 生成失败，请重试。');
    } else if (event === 'done') {
      if (
        !isObject(data.userMessage) ||
        !isObject(data.assistantMessage) ||
        !isObject(data.conversation) ||
        typeof data.assistantMessage.content !== 'string' ||
        typeof data.conversation.id !== 'number'
      ) {
        throw new Error('AI 完成事件格式错误');
      }
      reply = data as unknown as MessageReply;
      return false;
    }
  });
  if (!reply) throw new Error('AI 回复连接已中断，未完成的内容未保存，可重试。');
  return reply;
}

export const getAiConfig = (): Promise<ApiResult<AiConfig>> => getFetcher('/ai/config');
export const getConversations = (): Promise<ApiResult<Conversation[]>> =>
  getFetcher('/ai/conversations');
export const createConversation = async (
  title: string,
  signal?: AbortSignal,
): Promise<ApiResult<Conversation>> => {
  if (!signal) return postFetcher('/ai/conversations', { title });
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  const token = getAccessToken();
  const response = await fetch(`${baseUrl}/ai/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ title }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
  });
  if (response.status === 401) {
    clearAccessToken();
    window.location.assign('/auth/auth2/login');
  }
  const result = (await response.json()) as ApiResult<Conversation>;
  if (!response.ok || !result.success) throw new Error(result.message || '创建对话失败，请重试。');
  return result;
};
export const deleteConversation = (id: number): Promise<ApiResult<void>> =>
  deleteFetcher(`/ai/conversations/${id}`);
export const getMessages = (id: number): Promise<ApiResult<ChatMessage[]>> =>
  getFetcher(`/ai/conversations/${id}/messages`);
export const sendMessage = (
  id: number,
  content: string,
): Promise<
  ApiResult<{ userMessage: ChatMessage; assistantMessage: ChatMessage; conversation: Conversation }>
> => postFetcher(`/ai/conversations/${id}/messages`, { content });
